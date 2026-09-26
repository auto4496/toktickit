import { NextFunction, Response, Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import prisma from './prisma.js';
import { AuthRequest, clearCookies, hasExactKeys, requireRole, safeUser } from './auth/http.js';
import { hashPassword, normalizeEmail, passwordValidationError, PasswordServiceBusyError, verifyPassword } from './auth/password.js';
import { lockAccounts } from './account-lock.js';
import { sendUnexpectedError } from './api-error.js';

class UserError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors?: Record<string, string>) { super(message); }
}
const fail = (status: number, code: string, message: string, fields?: Record<string, string>): never => { throw new UserError(status, code, message, fields); };
const invalid = (fields: Record<string, string>): never => fail(400, 'VALIDATION_FAILED', 'Please correct the highlighted fields.', fields);
const conflict = (): never => fail(409, 'USER_CONFLICT', 'This account changed. Reload and review the latest account before saving again.');
const wrap = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => (req: AuthRequest, res: Response, next: NextFunction) => {
  void fn(req, res).catch(error => {
    if (error instanceof PasswordServiceBusyError) return next(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') error = new UserError(409, 'EMAIL_ALREADY_EXISTS', 'This email address is already in use.', { email: 'Choose a different email address.' });
    if (error instanceof UserError) return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } });
    // Database messages may contain submitted credentials. Never log the raw error.
    sendUnexpectedError(res, 'USER_ADMINISTRATION_UNAVAILABLE', 'The account could not be processed. Please try again.', 'admin.users', { name: error instanceof Error ? error.name : 'UnknownError', code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined });
  });
};
const roles = Object.values(Role);
function editable(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim().normalize('NFC') : '';
  const email = normalizeEmail(body.email);
  const fields: Record<string, string> = {};
  if (!name || [...name].length > 100) fields.name = 'Enter a name between 1 and 100 characters.';
  if (!email) fields.email = 'Enter a valid email address.';
  if (!roles.includes(body.role as Role)) fields.role = 'Choose one role.';
  if (typeof body.isActive !== 'boolean') fields.isActive = 'Choose an active or inactive account.';
  if (Object.keys(fields).length) invalid(fields);
  return { name, email: email!, role: body.role as Role, isActive: body.isActive as boolean };
}
function version(body: Record<string, unknown>) {
  if (!Number.isInteger(body.expectedVersion) || (body.expectedVersion as number) < 1 || (body.expectedVersion as number) > 2147483647) invalid({ expectedVersion: 'Reload the account before saving.' });
  return body.expectedVersion as number;
}
function userId(req: AuthRequest) {
  const id = req.params.userId;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return invalid({ userId: 'Provide a valid user ID.' });
  return id;
}
async function lockActor(tx: Prisma.TransactionClient, req: AuthRequest) {
  await lockAccounts(tx);
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${req.auth!.user.id} FOR UPDATE`;
  const actor = await tx.user.findUnique({ where: { id: req.auth!.user.id } });
  const session = await tx.authSession.findUnique({ where: { id: req.auth!.session.id } });
  if (!actor?.isActive || actor.mustChangePassword || actor.role !== 'ADMINISTRATOR' || actor.version !== req.auth!.user.version || !session || session.userVersion !== actor.version || session.expiresAt <= new Date()) fail(401, 'AUTH_REQUIRED', 'Sign in to continue.');
}
async function target(tx: Prisma.TransactionClient, id: string, expectedVersion: number) {
  // Serialize with login and password changes as well as other administrators.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id } });
  if (!user) return fail(404, 'RESOURCE_NOT_FOUND', 'The requested account was not found.');
  if (user.version !== expectedVersion) conflict();
  return user;
}
export const adminUsersRouter = Router();
adminUsersRouter.use('/admin/users', requireRole('ADMINISTRATOR'));
adminUsersRouter.get('/admin/users', wrap(async (req, res) => {
  const q = req.query;
  if (Object.keys(q).some(key => !['search', 'role'].includes(key)) || q.search !== undefined && (typeof q.search !== 'string' || [...q.search.trim()].length > 100) || q.role !== undefined && (typeof q.role !== 'string' || !roles.includes(q.role as Role))) invalid({ search: 'Use a search of up to 100 characters and a valid role.' });
  const search = typeof q.search === 'string' ? q.search.trim().replace(/[\\%_]/g, '\\$&') : '';
  const users = await prisma.user.findMany({ where: { ...(q.role ? { role: q.role as Role } : {}), ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}) }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  res.json({ data: users.map(safeUser) });
}));
adminUsersRouter.post('/admin/users', wrap(async (req, res) => {
  if (!hasExactKeys(req.body, ['name', 'email', 'role', 'isActive', 'initialPassword'])) return invalid({ form: 'Provide only the account fields and an initial password.' });
  const data = editable(req.body);
  const passwordError = passwordValidationError(req.body.initialPassword);
  if (passwordError) return invalid({ initialPassword: passwordError });
  const passwordHash = await hashPassword(req.body.initialPassword as string);
  const user = await prisma.$transaction(async tx => {
    await lockActor(tx, req);
    return tx.user.create({ data: { ...data, passwordHash, mustChangePassword: true } });
  });
  res.status(201).json({ data: safeUser(user) });
}));
adminUsersRouter.patch('/admin/users/:userId', wrap(async (req, res) => {
  const id = userId(req);
  if (!hasExactKeys(req.body, ['name', 'email', 'role', 'isActive', 'expectedVersion'])) return invalid({ form: 'Provide the complete editable account form.' });
  const data = editable(req.body), expectedVersion = version(req.body);
  const result = await prisma.$transaction(async tx => {
    await lockActor(tx, req);
    const current = await target(tx, id, expectedVersion);
    if (id === req.auth!.user.id && !data.isActive) fail(409, 'SELF_DEACTIVATION_FORBIDDEN', 'You cannot deactivate your own account.', { isActive: 'Your own account must stay active.' });
    if (current.isActive && current.role === 'ADMINISTRATOR' && (!data.isActive || data.role !== 'ADMINISTRATOR') && await tx.user.count({ where: { isActive: true, role: 'ADMINISTRATOR', id: { not: id } } }) === 0) fail(409, 'LAST_ACTIVE_ADMIN_REQUIRED', 'Keep at least one active administrator.', { role: 'Create or activate another administrator first.' });
    if ((!data.isActive || data.role === 'REQUESTER') && await tx.ticket.count({ where: { ownerId: id, currentStatus: { notIn: ['CLOSED', 'CANCELLED'] } } })) fail(409, 'USER_HAS_ACTIVE_TICKETS', 'Reassign this user’s unfinished tickets before changing their role or activity.', { role: 'This user still owns unfinished tickets.', isActive: 'Reassign unfinished tickets first.' });
    const user = await tx.user.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
    const revoked = current.role !== user.role || current.isActive !== user.isActive;
    if (revoked) await tx.authSession.deleteMany({ where: { userId: id } });
    else await tx.authSession.updateMany({ where: { userId: id }, data: { userVersion: user.version } });
    return { user, revoked };
  });
  if (id === req.auth!.user.id && result.revoked) clearCookies(res);
  res.json({ data: safeUser(result.user) });
}));
adminUsersRouter.post('/admin/users/:userId/initial-password', wrap(async (req, res) => {
  const id = userId(req);
  if (!hasExactKeys(req.body, ['initialPassword', 'confirmPassword', 'expectedVersion'])) return invalid({ form: 'Provide and confirm the new initial password.' });
  const expectedVersion = version(req.body), passwordError = passwordValidationError(req.body.initialPassword);
  if (passwordError) return invalid({ initialPassword: passwordError });
  if (req.body.initialPassword !== req.body.confirmPassword) return invalid({ confirmPassword: 'Passwords must match.' });
  const snapshot = await prisma.user.findUnique({ where: { id } });
  if (!snapshot) return fail(404, 'RESOURCE_NOT_FOUND', 'The requested account was not found.');
  if (snapshot.version !== expectedVersion) conflict();
  if (await verifyPassword(req.body.initialPassword as string, snapshot.passwordHash)) return invalid({ initialPassword: 'Choose a password different from the current password.' });
  const passwordHash = await hashPassword(req.body.initialPassword as string);
  const user = await prisma.$transaction(async tx => {
    await lockActor(tx, req);
    await target(tx, id, expectedVersion);
    const updated = await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true, version: { increment: 1 } } });
    await tx.authSession.deleteMany({ where: { userId: id } });
    return updated;
  });
  if (id === req.auth!.user.id) clearCookies(res);
  res.json({ data: safeUser(user) });
}));
