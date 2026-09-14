import { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth/http.js';
import { sendExpectedError } from './api-error.js';

export type RequesterSummary = { id: string; name: string; email: string };
export interface RequesterContextRequest extends AuthRequest { requester?: RequesterSummary }

// Identity is set only by the session middleware; the legacy header is ignored.
export function requireRequesterContext(req: RequesterContextRequest, res: Response, next: NextFunction) {
  const user = req.auth?.user;
  if (!user?.isActive) return sendExpectedError(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.');
  if (user.role !== 'REQUESTER') return sendExpectedError(res, 403, 'FORBIDDEN', 'This action is available to Requesters only.');
  req.requester = { id: user.id, name: user.name, email: user.email };
  next();
}
