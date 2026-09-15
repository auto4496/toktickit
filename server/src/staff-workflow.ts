import { NextFunction, Response, Router } from 'express';
import { Prisma, Priority, Role, TicketStatus } from '@prisma/client';
import prisma from './prisma.js';
import { AuthRequest, hasExactKeys, requireRole } from './auth/http.js';
import { sendExpectedError, sendUnexpectedError } from './api-error.js';
import { getOwnedTicketDetail } from './attachment-service.js';
import { parseTicketListQuery, mapTicketSummary, ticketSummarySelect } from './ticket-query.js';
import { lockAccounts } from './account-lock.js';
import { canIndicate, needsConfirmation, needsOwner, normalizeContent, statusTransitions, terminal } from './workflow-rules.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class WorkflowError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const fail = (status: number, code: string, message: string): never => { throw new WorkflowError(status, code, message); };
const invalid = () => fail(400, 'VALIDATION_FAILED', 'Check the submitted fields and try again.');
const missing = () => fail(404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.');
const conflict = () => fail(409, 'TICKET_CONFLICT', 'This ticket changed. Reload the latest details before trying again.');
const readOnly = () => fail(409, 'TICKET_READ_ONLY', 'This ticket is read-only.');
const wrap = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: AuthRequest, res: Response, _next: NextFunction) => { void fn(req, res).catch(error => {
    if (error instanceof WorkflowError) return sendExpectedError(res, error.status, error.code, error.message);
    // Prisma error messages can embed submitted content. Log only a safe type
    // and database error code, never the message/stack or conversation draft.
    sendUnexpectedError(res, 'WORKFLOW_UNAVAILABLE', 'The request could not be completed. Try again.', 'workflow', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
    });
  }); };
function ticketId(req: AuthRequest) {
  const value = req.params.ticketId;
  if (typeof value !== 'string' || !uuid.test(value)) return invalid();
  return value;
}
async function authorizedTicket(tx: Prisma.TransactionClient, req: AuthRequest, id: string) {
  const ticket = await tx.ticket.findFirst({ where: { id, ...(req.auth!.user.role === 'REQUESTER' ? { requesterId: req.auth!.user.id } : {}) } });
  if (!ticket) return missing();
  return ticket;
}
async function lockActor(tx: Prisma.TransactionClient, req: AuthRequest) {
  await lockAccounts(tx);
  const actor = await tx.user.findUnique({ where: { id: req.auth!.user.id } });
  const session = await tx.authSession.findUnique({ where: { id: req.auth!.session.id } });
  if (!actor?.isActive || actor.mustChangePassword || actor.version !== req.auth!.user.version || !session || session.expiresAt <= new Date()) {
    fail(401, 'AUTH_REQUIRED', 'Sign in to continue.');
  }
}
function pageQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some(key => !['page', 'pageSize'].includes(key))) invalid();
  const number = (key: string, fallback: number) => {
    const raw = query[key]; if (raw === undefined) return fallback;
    if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return invalid();
    const value = Number(raw); if (!Number.isSafeInteger(value) || value > 2147483647) return invalid();
    return value;
  };
  const page = number('page', 1), pageSize = number('pageSize', 20);
  if (![10, 20, 50].includes(pageSize) || (page - 1) * pageSize > 2147483647) invalid();
  return { page, pageSize };
}
export const workflowRouter = Router();
workflowRouter.get('/staff/eligible-owners', requireRole('IT_STAFF'), wrap(async (_req, res) => {
  res.json({ data: await prisma.user.findMany({ where: { isActive: true, role: { in: ['IT_STAFF', 'ADMINISTRATOR'] } }, select: { id: true, name: true, role: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }) });
}));
workflowRouter.get('/staff/tickets', requireRole('IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  const raw = { ...req.query } as Record<string, unknown>;
  const owner = raw.owner ?? 'all'; delete raw.owner;
  if (typeof owner !== 'string' || (!['all', 'unassigned', 'me'].includes(owner) && !uuid.test(owner))) invalid();
  if ('requestedPriority' in raw || raw.sortBy === 'requestedPriority') invalid();
  if ('itPriority' in raw) { raw.requestedPriority = raw.itPriority; delete raw.itPriority; }
  if (raw.sortBy === 'itPriority') raw.sortBy = 'requestedPriority';
  if (typeof raw.search === 'string' && !raw.search.trim()) delete raw.search;
  const parsed = parseTicketListQuery(raw); if (!parsed.success) return invalid();
  const q = parsed.value;
  const where: Prisma.TicketWhereInput = {
    ...(q.categoryId ? { categoryId: q.categoryId } : {}), ...(q.currentStatus ? { currentStatus: q.currentStatus } : {}),
    ...(q.requestedPriority ? { itPriority: q.requestedPriority } : {}),
    ...(owner === 'unassigned' ? { ownerId: null } : owner === 'me' ? { ownerId: req.auth!.user.id } : owner !== 'all' ? { ownerId: owner as string } : {}),
    ...(q.search ? { OR: ['ticketNumber', 'summary', 'description'].map(field => ({ [field]: { contains: q.search!.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' } })) } : {}),
  };
  const result = await prisma.$transaction(async tx => {
    if (q.categoryId && !await tx.category.findUnique({ where: { id: q.categoryId } })) invalid();
    if (!['all', 'unassigned', 'me'].includes(owner as string) && !await tx.user.findUnique({ where: { id: owner as string } })) invalid();
    const totalItems = await tx.ticket.count({ where });
    let skip = (q.page - 1) * q.pageSize, take: number = q.pageSize;
    const data: ReturnType<typeof mapTicketSummary>[] = [];
    if (q.sortBy === 'requestedPriority') {
      const ranks: Priority[] = q.sortDirection === 'asc' ? ['LOW', 'MEDIUM', 'HIGH'] : ['HIGH', 'MEDIUM', 'LOW'];
      for (const itPriority of ranks) {
        if (q.requestedPriority && q.requestedPriority !== itPriority) continue;
        const group = { ...where, itPriority }; const count = await tx.ticket.count({ where: group });
        if (skip >= count) { skip -= count; continue; }
        const rows = await tx.ticket.findMany({ where: group, select: ticketSummarySelect, orderBy: { ticketNumber: 'desc' }, skip, take });
        data.push(...rows.map(mapTicketSummary)); take -= rows.length; skip = 0; if (!take) break;
      }
    } else {
      const orderBy: Prisma.TicketOrderByWithRelationInput[] = [{ [q.sortBy]: q.sortDirection }];
      if (q.sortBy !== 'ticketNumber') orderBy.push({ ticketNumber: 'desc' });
      data.push(...(await tx.ticket.findMany({ where, select: ticketSummarySelect, orderBy, skip, take })).map(mapTicketSummary));
    }
    return { data, meta: { page: q.page, pageSize: q.pageSize, totalItems, totalPages: Math.ceil(totalItems / q.pageSize), sortBy: q.sortBy === 'requestedPriority' ? 'itPriority' : q.sortBy, sortDirection: q.sortDirection } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  res.json(result);
}));
workflowRouter.get('/staff/tickets/:ticketId', requireRole('IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  const id = ticketId(req); await authorizedTicket(prisma, req, id);
  res.json({ data: await getOwnedTicketDetail(prisma, undefined, id) });
}));

type Operation = 'claim' | 'owner' | 'priority' | 'status' | 'indication';
const operate = (operation: Operation) => wrap(async (req, res) => {
  const id = ticketId(req);
  const data = await prisma.$transaction(async tx => {
    await lockActor(tx, req);
    await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${id} FOR UPDATE`;
    const ticket = await authorizedTicket(tx, req, id);
    const body = req.body;
    const keys = operation === 'owner' ? ['ownerId', 'expectedVersion', 'confirmed'] : operation === 'priority' ? ['itPriority', 'expectedVersion'] : operation === 'status' ? ['currentStatus', 'expectedVersion', ...(Object.hasOwn(body ?? {}, 'confirmed') ? ['confirmed'] : [])] : ['expectedVersion'];
    if (!hasExactKeys(body, keys) || !Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion as number) < 1) invalid();
    if (operation === 'owner' && (body.confirmed !== true || !(body.ownerId === null || typeof body.ownerId === 'string' && uuid.test(body.ownerId)))) invalid();
    if (operation === 'priority' && !Object.values(Priority).includes(body.itPriority as Priority)) invalid();
    if (operation === 'status' && (!Object.values(TicketStatus).includes(body.currentStatus as TicketStatus) || ('confirmed' in body && typeof body.confirmed !== 'boolean') || needsConfirmation(body.currentStatus as TicketStatus) && body.confirmed !== true)) invalid();
    if (body.expectedVersion !== ticket.version) conflict();
    if (terminal(ticket.currentStatus) && !(operation === 'status' && ticket.currentStatus === 'CLOSED' && body.currentStatus === 'REOPENED')) readOnly();
    const update: Prisma.TicketUncheckedUpdateInput = { version: { increment: 1 }, updatedAt: new Date() };
    if (operation === 'claim' || operation === 'owner') {
      if (operation === 'claim' && ticket.ownerId) conflict();
      const ownerId = operation === 'claim' ? req.auth!.user.id : body.ownerId as string | null;
      if (ownerId === null && !['NEW', 'OPEN', 'REOPENED'].includes(ticket.currentStatus)) fail(409, 'OWNER_CLEAR_NOT_ALLOWED', 'An owner cannot be cleared in this status.');
      if (ownerId) {
        const owner = await tx.user.findUnique({ where: { id: ownerId } });
        if (!owner?.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(owner.role)) fail(400, 'OWNER_NOT_ELIGIBLE', 'Choose an active IT Staff member or Administrator.');
      }
      update.ownerId = ownerId;
    } else if (operation === 'priority') update.itPriority = body.itPriority as Priority;
    else if (operation === 'status') {
      const next = body.currentStatus as TicketStatus;
      if (!statusTransitions[ticket.currentStatus].includes(next)) fail(409, 'INVALID_STATUS_TRANSITION', 'This status transition is not allowed.');
      const owner = ticket.ownerId ? await tx.user.findUnique({ where: { id: ticket.ownerId } }) : null;
      if (needsOwner(next) && (!owner?.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(owner.role))) fail(409, 'ACTIVE_OWNER_REQUIRED', 'Assign an active owner before changing to this status.');
      update.currentStatus = next; if (next === 'REOPENED') update.requesterResolvedAt = null;
    } else {
      if (!canIndicate(ticket.currentStatus)) fail(409, 'RESOLUTION_INDICATION_NOT_ALLOWED', 'Resolution can only be reported while this ticket is being handled.');
      if (ticket.requesterResolvedAt) return getOwnedTicketDetail(tx, undefined, id);
      update.requesterResolvedAt = new Date();
    }
    await tx.ticket.update({ where: { id }, data: update });
    return getOwnedTicketDetail(tx, undefined, id);
  });
  res.json({ data });
});
workflowRouter.post('/staff/tickets/:ticketId/claim', requireRole('IT_STAFF'), operate('claim'));
workflowRouter.patch('/staff/tickets/:ticketId/owner', requireRole('IT_STAFF'), operate('owner'));
workflowRouter.patch('/staff/tickets/:ticketId/priority', requireRole('IT_STAFF', 'ADMINISTRATOR'), operate('priority'));
workflowRouter.patch('/staff/tickets/:ticketId/status', requireRole('IT_STAFF'), operate('status'));
workflowRouter.post('/tickets/:ticketId/resolution-indication', requireRole('REQUESTER'), operate('indication'));

const entrySelect = { id: true, ticketId: true, content: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } as const;
for (const internal of [false, true]) {
  const path = `/tickets/:ticketId/${internal ? 'internal-notes' : 'comments'}`;
  const readers: Role[] = internal ? ['IT_STAFF', 'ADMINISTRATOR'] : ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'];
  const writers: Role[] = internal ? ['IT_STAFF'] : ['REQUESTER', 'IT_STAFF'];
  workflowRouter.get(path, requireRole(...readers), wrap(async (req, res) => {
    const id = ticketId(req);
    const result = await prisma.$transaction(async tx => {
      await authorizedTicket(tx, req, id);
      const { page, pageSize } = pageQuery(req.query);
      const args = { where: { ticketId: id }, select: entrySelect, orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }], skip: (page - 1) * pageSize, take: pageSize };
      const totalItems = internal ? await tx.internalNote.count({ where: { ticketId: id } }) : await tx.publicComment.count({ where: { ticketId: id } });
      const data = internal ? await tx.internalNote.findMany(args) : await tx.publicComment.findMany(args);
      return { data, meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    res.json(result);
  }));
  workflowRouter.post(path, requireRole(...writers), wrap(async (req, res) => {
    const id = ticketId(req);
    const data = await prisma.$transaction(async tx => {
      await lockActor(tx, req);
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${id} FOR UPDATE`;
      const ticket = await authorizedTicket(tx, req, id);
      if (!hasExactKeys(req.body, ['content'])) invalid();
      const content = normalizeContent(req.body.content); if (content === null) return invalid();
      if (terminal(ticket.currentStatus)) readOnly();
      const args = { data: { ticketId: id, authorId: req.auth!.user.id, content }, select: entrySelect };
      const entry = internal ? await tx.internalNote.create(args) : await tx.publicComment.create(args);
      await tx.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
      return entry;
    });
    res.status(201).json({ data });
  }));
}
