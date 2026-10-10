import { NextFunction, Response, Router } from 'express';
import { Prisma, Priority, TicketStatus } from '@prisma/client';
import prisma from './prisma.js';
import { AuthRequest, requireRole } from './auth/http.js';
import { sendExpectedError } from './api-error.js';
import { openTicketStatuses as nonterminal } from './ticket-scopes.js';

const statuses: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
const recentSelect = { id: true, ticketNumber: true, summary: true, currentStatus: true, itPriority: true, updatedAt: true } as const;
const wrap = (handler: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: AuthRequest, res: Response, _next: NextFunction) => { void handler(req, res).catch(() => {
    sendExpectedError(res, 503, 'DASHBOARD_UNAVAILABLE', 'Dashboard information is unavailable. Try again.');
  }); };
const period = () => {
  const asOf = new Date();
  return { asOf, windowStart: new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000) };
};

export const dashboardRouter = Router();
dashboardRouter.get('/dashboard/requester', requireRole('REQUESTER'), wrap(async (req, res) => {
  if (Object.keys(req.query).length) return sendExpectedError(res, 400, 'INVALID_QUERY_PARAMETER', 'Dashboard does not accept filters.');
  const { asOf, windowStart } = period();
  const requesterId = req.auth!.user.id;
  const where = { requesterId };
  const data = await prisma.$transaction(async tx => {
    const [open, waitingForRequester, recentlyUpdated, recentlyResolved, recentTickets] = await Promise.all([
      tx.ticket.count({ where: { ...where, currentStatus: { in: nonterminal } } }),
      tx.ticket.count({ where: { ...where, currentStatus: 'WAITING_FOR_REQUESTER' } }),
      tx.ticket.count({ where: { ...where, updatedAt: { gte: windowStart, lte: asOf } } }),
      tx.ticket.count({ where: { ...where, currentStatus: 'RESOLVED', updatedAt: { gte: windowStart, lte: asOf } } }),
      tx.ticket.findMany({ where: { ...where, updatedAt: { gte: windowStart, lte: asOf } }, select: recentSelect, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 5 }),
    ]);
    return { asOf: asOf.toISOString(), windowStart: windowStart.toISOString(), metrics: { open, waitingForRequester, recentlyUpdated, recentlyResolved }, recentTickets: recentTickets.map(({ itPriority: _private, ...row }) => ({ ...row, updatedAt: row.updatedAt.toISOString(), href: `/tickets/${row.id}` })) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  res.json(data);
}));

dashboardRouter.get('/dashboard/staff', requireRole('IT_STAFF', 'ADMINISTRATOR'), wrap(async (req, res) => {
  if (Object.keys(req.query).length) return sendExpectedError(res, 400, 'INVALID_QUERY_PARAMETER', 'Dashboard does not accept filters.');
  const { asOf, windowStart } = period();
  const actorId = req.auth!.user.id;
  const data = await prisma.$transaction(async tx => {
    const [unassigned, myOwned, myFollowUps, statusGroups, priorityGroups, recentTickets] = await Promise.all([
      tx.ticket.count({ where: { ownerId: null, currentStatus: { in: nonterminal } } }),
      tx.ticket.count({ where: { ownerId: actorId, currentStatus: { in: nonterminal } } }),
      tx.actionTaken.count({ where: { assignedToId: actorId, followUpRequired: true, status: { in: ['PLANNED', 'IN_PROGRESS'] }, ticket: { currentStatus: { in: nonterminal } } } }),
      tx.ticket.groupBy({ by: ['currentStatus'], _count: { _all: true } }),
      tx.ticket.groupBy({ by: ['itPriority'], _count: { _all: true } }),
      tx.ticket.findMany({ where: { updatedAt: { gte: windowStart, lte: asOf } }, select: recentSelect, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 5 }),
    ]);
    const byStatus = Object.fromEntries(statuses.map(status => [status, statusGroups.find(group => group.currentStatus === status)?._count._all ?? 0])) as Record<TicketStatus, number>;
    const byPriority = Object.fromEntries(priorities.map(priority => [priority, priorityGroups.find(group => group.itPriority === priority)?._count._all ?? 0])) as Record<Priority, number>;
    return { asOf: asOf.toISOString(), windowStart: windowStart.toISOString(), metrics: { unassigned, myOwned, myFollowUps, byStatus, byPriority }, recentTickets: recentTickets.map(row => ({ ...row, updatedAt: row.updatedAt.toISOString(), href: `/staff/tickets/${row.id}` })) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  res.json(data);
}));
