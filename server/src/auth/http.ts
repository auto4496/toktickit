import { NextFunction, Request, Response, Router } from 'express';
import { Role, User } from '@prisma/client';
import prisma from '../prisma.js';
import { sendExpectedError, sendUnexpectedError } from '../api-error.js';
import { hashPassword, normalizeEmail, passwordValidationError, PasswordServiceBusyError, verifyPassword } from './password.js';
import { createSessionMaterial, tokenDigest, tokenMatches } from './tokens.js';
import { FixedWindowLimiter } from './rate-limit.js';

const SID = 'toktickit.sid';
const PRE = 'toktickit.pre-auth';
export const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';
const originUrl = new URL(clientOrigin);
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(originUrl.hostname);
const secure = originUrl.protocol === 'https:';
if (!['http:', 'https:'].includes(originUrl.protocol) || originUrl.origin !== clientOrigin || (!secure && (!loopback || process.env.NODE_ENV === 'production'))) {
  throw new Error('CLIENT_ORIGIN must be an exact HTTPS origin, or a loopback development/test origin.');
}
const cookieOptions = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
const preAuth = new Map<string, { csrfToken: string; expiresAt: Date }>();
const emailLimits = new FixedWindowLimiter(5, 900_000, 10_000);
const ipLimits = new FixedWindowLimiter(30, 900_000, 10_000);
const changeLimits = new FixedWindowLimiter(5, 900_000, 10_000);
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => dummyHash ??= hashPassword('Local dummy credential never accepted');
export const safeUser = (user: User) => ({
  id: user.id, name: user.name, email: user.email, role: user.role,
  isActive: user.isActive, mustChangePassword: user.mustChangePassword,
  version: user.version, createdAt: user.createdAt, updatedAt: user.updatedAt,
});
type Auth = { user: User; session: { id: string; tokenHash: string; csrfToken: string; expiresAt: Date } };
export interface AuthRequest extends Request { auth?: Auth }
function cookie(req: Request, name: string) {
  const values = (req.headers.cookie ?? '').split(';').map((v) => v.trim()).filter((v) => v.startsWith(`${name}=`));
  return values.length === 1 ? values[0].slice(name.length + 1) : undefined;
}
function clearCookies(res: Response) { res.clearCookie(SID, cookieOptions); res.clearCookie(PRE, cookieOptions); }
function setSession(res: Response, material: ReturnType<typeof createSessionMaterial>) {
  res.cookie(SID, material.token, { ...cookieOptions, maxAge: material.maxAgeSeconds * 1000 });
}
function preSession(req: Request) {
  for (const [id, item] of preAuth) if (item.expiresAt.getTime() <= Date.now()) preAuth.delete(id);
  const digest = tokenDigest(cookie(req, PRE));
  return digest ? preAuth.get(digest) : undefined;
}
function csrfValid(req: Request, expected?: string) {
  return req.get('Origin') === clientOrigin && !!expected && tokenMatches(req.get('X-CSRF-Token'), expected);
}
function throttled(res: Response, seconds: number) {
  res.setHeader('Retry-After', seconds);
  return sendExpectedError(res, 429, 'AUTH_RATE_LIMITED', 'Too many attempts. Please wait before trying again.');
}
function invalid(res: Response, fieldErrors: Record<string, string>) {
  return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Please correct the highlighted fields.', fieldErrors } });
}
export function hasExactKeys(body: unknown, keys: string[]): body is Record<string, unknown> {
  return !!body && typeof body === 'object' && !Array.isArray(body) &&
    Object.keys(body).every((key) => keys.includes(key)) && keys.every((key) => Object.hasOwn(body, key));
}
const wrap = (handler: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => { void handler(req, res).catch(next); };
export async function loadAuth(req: AuthRequest, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const tokenHash = tokenDigest(cookie(req, SID));
    if (tokenHash) {
      const session = await prisma.authSession.findUnique({ where: { tokenHash }, include: { user: true } });
      if (session && session.expiresAt.getTime() > Date.now() && session.user.isActive && session.user.version === session.userVersion) req.auth = { user: session.user, session };
    }
    next();
  } catch (error) { next(error); }
}
export function requireFullSession(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth) return sendExpectedError(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.');
  if (req.auth.user.mustChangePassword) return sendExpectedError(res, 403, 'PASSWORD_CHANGE_REQUIRED', 'Change your initial password to continue.');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !csrfValid(req, req.auth.session.csrfToken)) return sendExpectedError(res, 403, 'CSRF_REJECTED', 'Refresh the page and try again.');
  next();
}
export const requireRole = (...roles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.auth) return sendExpectedError(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.');
  if (!roles.includes(req.auth.user.role)) return sendExpectedError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action.');
  next();
};
export const authRouter = Router();
authRouter.get('/csrf', wrap(async (req, res) => {
  if (req.auth) return res.json({ csrfToken: req.auth.session.csrfToken });
  const current = preSession(req);
  if (current) return res.json({ csrfToken: current.csrfToken });
  if (preAuth.size >= 10_000) return throttled(res, 60);
  const material = createSessionMaterial(true);
  preAuth.set(material.tokenHash, { csrfToken: material.csrfToken, expiresAt: material.expiresAt });
  res.cookie(PRE, material.token, { ...cookieOptions, maxAge: 900_000 });
  res.json({ csrfToken: material.csrfToken });
}));
authRouter.post('/login', wrap(async (req, res) => {
  if (!csrfValid(req, preSession(req)?.csrfToken)) return sendExpectedError(res, 403, 'CSRF_REJECTED', 'Refresh the page and try again.');
  if (!hasExactKeys(req.body, ['email', 'password'])) return invalid(res, { form: 'Provide email and password only.' });
  const email = normalizeEmail(req.body.email);
  if (!email || typeof req.body.password !== 'string' || req.body.password.length > 512 || !req.body.password) return invalid(res, { form: 'Enter a valid email address and password.' });
  const ip = req.ip ?? 'unknown';
  const retry = Math.max(emailLimits.retryAfter(email), ipLimits.retryAfter(ip));
  if (retry) return throttled(res, retry);
  const user = await prisma.user.findUnique({ where: { email } });
  const usable = user?.passwordHash.startsWith('scrypt$');
  const verified = await verifyPassword(req.body.password, usable ? user!.passwordHash : await getDummyHash());
  if (!verified || !user?.isActive || !usable) {
    emailLimits.recordFailure(email); ipLimits.recordFailure(ip);
    return sendExpectedError(res, 401, 'INVALID_CREDENTIALS', 'Unable to sign in. Check your credentials or contact your administrator.');
  }
  const material = createSessionMaterial(user.mustChangePassword);
  const created = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!current.isActive || current.version !== user.version || current.passwordHash !== user.passwordHash) return false;
    await tx.authSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await tx.authSession.create({ data: { tokenHash: material.tokenHash, csrfToken: material.csrfToken, userId: user.id, userVersion: user.version, expiresAt: material.expiresAt } });
    const previous = tokenDigest(cookie(req, SID));
    if (previous) await tx.authSession.deleteMany({ where: { tokenHash: previous } });
    return true;
  });
  if (!created) return sendExpectedError(res, 401, 'INVALID_CREDENTIALS', 'Unable to sign in. Check your credentials or contact your administrator.');
  const preHash = tokenDigest(cookie(req, PRE)); if (preHash) preAuth.delete(preHash);
  res.clearCookie(PRE, cookieOptions); setSession(res, material);
  return res.json({ user: safeUser(user), csrfToken: material.csrfToken });
}));
authRouter.get('/me', (req: AuthRequest, res) => {
  if (!req.auth) return sendExpectedError(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.');
  return res.json({ user: safeUser(req.auth.user) });
});
authRouter.post('/logout', wrap(async (req, res) => {
  if (!csrfValid(req, req.auth?.session.csrfToken ?? preSession(req)?.csrfToken)) return sendExpectedError(res, 403, 'CSRF_REJECTED', 'Refresh the page and try again.');
  if (!hasExactKeys(req.body, [])) return invalid(res, { form: 'Logout does not accept fields.' });
  const digest = tokenDigest(cookie(req, SID));
  if (digest) await prisma.authSession.deleteMany({ where: { tokenHash: digest } });
  const preHash = tokenDigest(cookie(req, PRE)); if (preHash) preAuth.delete(preHash);
  clearCookies(res); res.status(204).end();
}));
authRouter.post('/change-password', wrap(async (req, res) => {
  if (!req.auth) return sendExpectedError(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.');
  const { user, session } = req.auth;
  if (!csrfValid(req, session.csrfToken)) return sendExpectedError(res, 403, 'CSRF_REJECTED', 'Refresh the page and try again.');
  const retry = changeLimits.retryAfter(session.tokenHash); if (retry) return throttled(res, retry);
  if (!hasExactKeys(req.body, ['currentPassword', 'newPassword', 'confirmPassword'])) return invalid(res, { form: 'Provide the three password fields only.' });
  const error = passwordValidationError(req.body.newPassword);
  if (error || req.body.newPassword !== req.body.confirmPassword || req.body.newPassword === req.body.currentPassword) {
    changeLimits.recordFailure(session.tokenHash);
    return invalid(res, { newPassword: error ?? 'Choose a different password and make sure confirmation matches.' });
  }
  if (!await verifyPassword(req.body.currentPassword, user.passwordHash)) {
    changeLimits.recordFailure(session.tokenHash);
    return sendExpectedError(res, 400, 'CURRENT_PASSWORD_INVALID', 'The current password is incorrect.');
  }
  const passwordHash = await hashPassword(req.body.newPassword as string);
  const material = createSessionMaterial(false);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    const live = await tx.authSession.findUnique({ where: { id: session.id } });
    if (!current.isActive || current.version !== user.version || !live || live.expiresAt.getTime() <= Date.now()) return null;
    const result = await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false, version: { increment: 1 } } });
    await tx.authSession.deleteMany({ where: { userId: user.id } });
    await tx.authSession.create({ data: { tokenHash: material.tokenHash, csrfToken: material.csrfToken, userId: user.id, userVersion: result.version, expiresAt: material.expiresAt } });
    return result;
  });
  if (!updated) return sendExpectedError(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.');
  setSession(res, material); res.json({ user: safeUser(updated), csrfToken: material.csrfToken });
}));
export function authError(error: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent || ['entity.parse.failed', 'entity.too.large'].includes((error as { type?: string })?.type ?? '')) return next(error);
  if (error instanceof PasswordServiceBusyError) return throttled(res, 5);
  if (req.path.startsWith('/api/auth')) return sendUnexpectedError(res, 'AUTH_UNAVAILABLE', 'Authentication is unavailable. Try again.', 'auth.request', { name: error instanceof Error ? error.name : 'UnknownError' });
  next(error);
}
