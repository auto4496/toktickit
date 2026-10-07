import { createHash } from 'node:crypto';
import { NextFunction, Response, Router } from 'express';
import { ActionOperation, ActionStatus, Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { AuthRequest, hasExactKeys, requireRole } from './auth/http.js';
import { lockAccounts } from './account-lock.js';
import { sendExpectedError, sendUnexpectedError } from './api-error.js';
import { terminal } from './workflow-rules.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const instant = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/;
const actionInclude = {
  assignedTo: { select: { id: true, name: true, isActive: true } },
  createdBy: { select: { id: true, name: true } },
  performedBy: { select: { id: true, name: true } },
} as const;
type ActionRow = Prisma.ActionTakenGetPayload<{ include: typeof actionInclude }>;
type Fields = { actionAt: Date; description: string; result: string; assignedToId: string; followUpRequired: boolean; followUpNote: string; attachmentNotes: string };

class ActionError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors?: Record<string, string>) { super(message); }
}
const fail = (status: number, code: string, message: string, fieldErrors?: Record<string, string>): never => { throw new ActionError(status, code, message, fieldErrors); };
const invalid = (fieldErrors: Record<string, string>) => fail(400, 'VALIDATION_FAILED', 'Please correct the highlighted fields.', fieldErrors);
const notFound = () => fail(404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.');
const readOnly = () => fail(409, 'ACTION_READ_ONLY', 'This Action can no longer be changed.');
const conflict = () => fail(409, 'ACTION_CONFLICT', 'This Action changed. Reload the latest details before trying again.');
const routeUuid = (value: unknown) => typeof value === 'string' && uuid.test(value) ? value : invalid({ id: 'Provide a valid ID.' });
const clean = (value: unknown, max: number, required: boolean) => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\r\n/g, '\n').normalize('NFC').trim();
  const length = [...text].length;
  return length <= max && (!required || length > 0) ? text : null;
};

function parseFields(body: Record<string, unknown>): Fields {
  const errors: Record<string, string> = {};
  const date = typeof body.actionAt === 'string' && instant.test(body.actionAt) ? new Date(body.actionAt) : new Date(NaN);
  if (!Number.isFinite(date.getTime())) errors.actionAt = 'Enter a date and time with a timezone.';
  if (typeof body.actionAt === 'string' && instant.test(body.actionAt)) {
    const [year, month, day] = body.actionAt.slice(0, 10).split('-').map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) errors.actionAt = 'Enter a valid calendar date.';
  }
  const description = clean(body.description, 2000, true);
  if (description === null) errors.description = 'Enter an Action Description of at most 2000 characters.';
  const result = clean(body.result, 2000, false);
  if (result === null) errors.result = 'Result must be at most 2000 characters.';
  if (typeof body.assignedToId !== 'string' || !uuid.test(body.assignedToId)) errors.assignedToId = 'Choose an eligible staff member.';
  if (typeof body.followUpRequired !== 'boolean') errors.followUpRequired = 'Choose whether follow-up is required.';
  const followUpNote = clean(body.followUpNote, 2000, body.followUpRequired === true);
  if (followUpNote === null) errors.followUpNote = body.followUpRequired ? 'Enter a Follow-up Note of at most 2000 characters.' : 'Follow-up Note must be at most 2000 characters.';
  const attachmentNotes = clean(body.attachmentNotes, 2000, false);
  if (attachmentNotes === null) errors.attachmentNotes = 'Attachment Notes must be at most 2000 characters.';
  if (Object.keys(errors).length) return invalid(errors);
  return { actionAt: date, description: description!, result: result!, assignedToId: body.assignedToId as string, followUpRequired: body.followUpRequired as boolean, followUpNote: body.followUpRequired ? followUpNote! : '', attachmentNotes: attachmentNotes! };
}

const dto = (row: ActionRow) => ({
  id: row.id, ticketId: row.ticketId, actionAt: row.actionAt.toISOString(),
  description: row.description, result: row.result, assignedTo: row.assignedTo,
  createdBy: row.createdBy, performedBy: row.performedBy,
  followUpRequired: row.followUpRequired, followUpNote: row.followUpNote,
  attachmentNotes: row.attachmentNotes, status: row.status, version: row.version,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
});
const snapshot = (row: ActionRow): Prisma.JsonObject => ({
  actionAt: row.actionAt.toISOString(), description: row.description, result: row.result,
  assignedToId: row.assignedToId, performedById: row.performedById,
  followUpRequired: row.followUpRequired, followUpNote: row.followUpNote,
  attachmentNotes: row.attachmentNotes, status: row.status, version: row.version,
});
const wrap = (handler: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: AuthRequest, res: Response, _next: NextFunction) => { void handler(req, res).catch(error => {
    if (error instanceof ActionError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } });
      return;
    }
    sendUnexpectedError(res, 'ACTIONS_UNAVAILABLE', 'Actions Taken could not be loaded or saved. Try again.', 'actions-taken', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
    });
  }); };

async function ticket(tx: Prisma.TransactionClient, req: AuthRequest, id: string) {
  const row = await tx.ticket.findFirst({ where: { id, ...(req.auth!.user.role === 'REQUESTER' ? { requesterId: req.auth!.user.id } : {}) }, select: { id: true, currentStatus: true } });
  if (!row) return notFound();
  return row;
}
async function ensureActor(tx: Prisma.TransactionClient, req: AuthRequest) {
  await lockAccounts(tx);
  const actor = await tx.user.findUnique({ where: { id: req.auth!.user.id } });
  const session = await tx.authSession.findUnique({ where: { id: req.auth!.session.id } });
  if (!actor?.isActive || actor.mustChangePassword || actor.version !== req.auth!.user.version || !session || session.expiresAt <= new Date()) {
    fail(401, 'AUTH_REQUIRED', 'Sign in to continue.');
  }
}
async function assignee(tx: Prisma.TransactionClient, id: string) {
  const user = await tx.user.findUnique({ where: { id } });
  if (!user?.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(user.role)) fail(400, 'ASSIGNEE_NOT_ELIGIBLE', 'Choose an active IT Staff member or Administrator.');
}
async function getAction(tx: Prisma.TransactionClient, ticketId: string, actionId: string) {
  const row = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId }, include: actionInclude });
  if (!row) return notFound();
  return row;
}
function pageQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some(key => !['page', 'pageSize'].includes(key))) invalid({ query: 'Only page and pageSize are supported.' });
  const parse = (key: string, fallback: number) => {
    if (query[key] === undefined) return fallback;
    if (typeof query[key] !== 'string' || !/^[1-9]\d*$/.test(query[key])) return invalid({ [key]: 'Use a positive integer.' });
    const number = Number(query[key]);
    if (!Number.isSafeInteger(number) || number > 2147483647) return invalid({ [key]: 'Use a smaller integer.' });
    return number;
  };
  const page = parse('page', 1), pageSize = parse('pageSize', 20);
  if (![10, 20, 50].includes(pageSize) || (page - 1) * pageSize > 2147483647) invalid({ pageSize: 'Use 10, 20 or 50.' });
  return { page, pageSize };
}

export const actionsRouter = Router();
actionsRouter.get('/tickets/:ticketId/actions/eligible-assignees', requireRole('IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  const id = routeUuid(req.params.ticketId);
  await ticket(prisma, req, id);
  const data = await prisma.user.findMany({ where: { isActive: true, role: { in: ['IT_STAFF', 'ADMINISTRATOR'] } },
    select: { id: true, name: true, isActive: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  res.json({ data });
}));
actionsRouter.get('/tickets/:ticketId/actions', requireRole('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  const id = routeUuid(req.params.ticketId);
  const { page, pageSize } = pageQuery(req.query);
  const result = await prisma.$transaction(async tx => {
    await ticket(tx, req, id);
    const where = { ticketId: id };
    const totalItems = await tx.actionTaken.count({ where });
    const rows = await tx.actionTaken.findMany({ where, include: actionInclude, orderBy: [{ actionAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize });
    return { data: rows.map(dto), meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  res.json(result);
}));
actionsRouter.get('/tickets/:ticketId/actions/:actionId', requireRole('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  const id = routeUuid(req.params.ticketId), actionId = routeUuid(req.params.actionId);
  const result = await prisma.$transaction(async tx => {
    await ticket(tx, req, id);
    const row = await getAction(tx, id, actionId);
    if (req.auth!.user.role === 'REQUESTER') return { data: dto(row) };
    const revisions = await tx.actionRevision.findMany({ where: { actionId }, select: { id: true, operation: true, snapshot: true, createdAt: true, actor: { select: { id: true, name: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    return { data: dto(row), revisions };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  res.json(result);
}));
actionsRouter.post('/tickets/:ticketId/actions', requireRole('IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  const id = routeUuid(req.params.ticketId);
  const key = req.get('Idempotency-Key');
  if (!key || !uuid.test(key)) invalid({ idempotencyKey: 'Provide a UUID idempotency key.' });
  const keys = ['actionAt', 'description', 'result', 'assignedToId', 'followUpRequired', 'followUpNote', 'attachmentNotes'];
  if (!hasExactKeys(req.body, keys)) invalid({ form: 'Provide the Action fields only.' });
  const fields = parseFields(req.body);
  const hash = createHash('sha256').update(JSON.stringify({ ...fields, actionAt: fields.actionAt.toISOString(), ticketId: id })).digest('hex');
  const outcome = await prisma.$transaction(async tx => {
    await ensureActor(tx, req);
    await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${id} FOR UPDATE`;
    const parent = await ticket(tx, req, id);
    const previous = await tx.actionCreateRequest.findUnique({ where: { actorId_idempotencyKey: { actorId: req.auth!.user.id, idempotencyKey: key! } } });
    if (previous) {
      if (previous.requestHash !== hash) fail(409, 'IDEMPOTENCY_KEY_REUSED', 'This key was already used for different Action data.');
      return { data: dto(await getAction(tx, id, previous.actionId)), replayed: true };
    }
    if (terminal(parent.currentStatus)) return readOnly();
    await assignee(tx, fields.assignedToId);
    const row = await tx.actionTaken.create({ data: { ticketId: id, createdById: req.auth!.user.id, performedById: req.auth!.user.id, ...fields }, include: actionInclude });
    await tx.actionRevision.create({ data: { actionId: row.id, actorId: req.auth!.user.id, operation: 'CREATED', snapshot: snapshot(row) } });
    await tx.actionCreateRequest.create({ data: { actorId: req.auth!.user.id, idempotencyKey: key!, requestHash: hash, actionId: row.id } });
    await tx.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
    return { data: dto(row), replayed: false };
  });
  if (outcome.replayed) res.setHeader('Idempotency-Replayed', 'true');
  res.status(outcome.replayed ? 200 : 201).json({ data: outcome.data });
}));

async function change(req: AuthRequest, mode: 'edit' | 'status') {
  const id = routeUuid(req.params.ticketId), actionId = routeUuid(req.params.actionId);
  const editKeys = ['actionAt', 'description', 'result', 'assignedToId', 'followUpRequired', 'followUpNote', 'attachmentNotes', 'expectedVersion'];
  const statusKeys = req.body?.status === 'COMPLETED' ? ['status', 'expectedVersion', 'result'] : ['status', 'expectedVersion'];
  if (!hasExactKeys(req.body, mode === 'edit' ? editKeys : statusKeys)) invalid({ form: 'Provide the expected Action fields only.' });
  if (!Number.isSafeInteger(req.body.expectedVersion) || req.body.expectedVersion < 1) invalid({ expectedVersion: 'Provide the current version.' });
  const fields = mode === 'edit' ? parseFields(req.body) : null;
  const next = mode === 'status' ? req.body.status as ActionStatus : null;
  if (mode === 'status' && !['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(next as string)) invalid({ status: 'Choose a permitted next status.' });
  const completionResult = next === 'COMPLETED' ? clean(req.body.result, 2000, true) : null;
  if (next === 'COMPLETED' && completionResult === null) invalid({ result: 'Enter a Result before completing this Action.' });
  return prisma.$transaction(async tx => {
    await ensureActor(tx, req);
    await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${id} FOR UPDATE`;
    const parent = await ticket(tx, req, id);
    const current = await getAction(tx, id, actionId);
    if (current.version !== req.body.expectedVersion) conflict();
    if (terminal(parent.currentStatus) || ['COMPLETED', 'CANCELLED'].includes(current.status)) readOnly();
    let operation: ActionOperation = 'EDITED';
    let data: Prisma.ActionTakenUncheckedUpdateInput;
    if (mode === 'edit') {
      await assignee(tx, fields!.assignedToId);
      data = { ...fields!, performedById: req.auth!.user.id, version: { increment: 1 } };
    } else {
      const permitted = current.status === 'PLANNED' ? ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] : ['COMPLETED', 'CANCELLED'];
      if (!permitted.includes(next!)) fail(409, 'INVALID_ACTION_TRANSITION', 'This Action status transition is not allowed.');
      if (next === 'COMPLETED') operation = 'COMPLETED';
      else if (next === 'CANCELLED') operation = 'CANCELLED';
      else operation = 'STARTED';
      data = { status: next!, ...(next === 'COMPLETED' ? { result: completionResult! } : {}), performedById: req.auth!.user.id, version: { increment: 1 } };
    }
    const updated = await tx.actionTaken.update({ where: { id: actionId }, data, include: actionInclude });
    await tx.actionRevision.create({ data: { actionId, actorId: req.auth!.user.id, operation, snapshot: snapshot(updated) } });
    await tx.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
    return dto(updated);
  });
}
actionsRouter.patch('/tickets/:ticketId/actions/:actionId', requireRole('IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  res.json({ data: await change(req, 'edit') });
}));
actionsRouter.patch('/tickets/:ticketId/actions/:actionId/status', requireRole('IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  res.json({ data: await change(req, 'status') });
}));
