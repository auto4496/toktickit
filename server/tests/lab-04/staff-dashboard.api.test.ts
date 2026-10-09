import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { fixtureCredential, sessionHeaders } from '../session-fixture.js';

const ids = [randomUUID(), randomUUID(), randomUUID()];
const prefix = `L4-STAFF-DASH-${randomUUID()}`;
const headers: Awaited<ReturnType<typeof sessionHeaders>>[] = [];
const ticketIds: string[] = [];
let categoryId: number, systemId: number, actionId: string;
const realTransaction = prisma.$transaction.bind(prisma);
const open = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] as const;
beforeAll(async () => {
  categoryId = (await prisma.category.create({ data: { name: prefix } })).id;
  systemId = (await prisma.relatedSystem.create({ data: { name: prefix } })).id;
  for (let i = 0; i < ids.length; i++) {
    await prisma.user.create({ data: { id: ids[i], name: `Staff dashboard ${i}`, email: `${ids[i]}@example.test`, role: i === 0 ? 'REQUESTER' : i === 1 ? 'IT_STAFF' : 'ADMINISTRATOR', ...fixtureCredential } });
    headers.push(await sessionHeaders(ids[i]));
  }
  for (let i = 0; i < 7; i++) ticketIds.push((await prisma.ticket.create({ data: {
    ticketNumber: `${prefix}-${i}`, requesterId: ids[0], categoryId, relatedSystemId: systemId,
    summary: `Staff dashboard ${i}`, description: 'Synthetic operational fixture',
    requestedPriority: 'HIGH', itPriority: i % 2 ? 'LOW' : 'HIGH',
    currentStatus: i === 6 ? 'CLOSED' : 'OPEN', ownerId: i % 2 ? ids[1] : null,
    updatedAt: new Date(Date.now() - i * 1000),
  } })).id);
  actionId = (await prisma.actionTaken.create({ data: { ticketId: ticketIds[1], assignedToId: ids[1], createdById: ids[1], performedById: ids[1], actionAt: new Date(), description: 'Request additional logs', followUpRequired: true, followUpNote: 'Ask for logs' } })).id;
  for (const [index, status, followUp, assignee] of [
    [1, 'IN_PROGRESS', true, ids[1]], [2, 'COMPLETED', true, ids[1]], [3, 'CANCELLED', true, ids[1]],
    [4, 'PLANNED', false, ids[1]], [5, 'PLANNED', true, ids[2]], [6, 'PLANNED', true, ids[1]],
  ] as const) await prisma.actionTaken.create({ data: { ticketId: ticketIds[index], assignedToId: assignee, createdById: ids[1], performedById: ids[1], actionAt: new Date(), description: 'Synthetic scope check', status, result: status === 'COMPLETED' ? 'Done' : '', followUpRequired: followUp, followUpNote: followUp ? 'Check logs' : '' } });
});
afterEach(() => { vi.restoreAllMocks(); prisma.$transaction = realTransaction; });
afterAll(async () => {
  if (ticketIds.length) await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
  if (ticketIds.length) await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  if (systemId) await prisma.relatedSystem.delete({ where: { id: systemId } });
});

describe('Staff dashboard', () => {
  it('matches authoritative counts and returns five newest Tickets', async () => {
    const result = await request(app).get('/api/dashboard/staff').set(headers[1]);
    expect(result.status).toBe(200);
    expect(result.body.metrics.unassigned).toBe(await prisma.ticket.count({ where: { ownerId: null, currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } } }));
    expect(result.body.metrics.myOwned).toBe(await prisma.ticket.count({ where: { ownerId: ids[1], currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } } }));
    expect(result.body.metrics.myFollowUps).toBe(2);
    expect(result.body.metrics.byPriority.HIGH).toBe(await prisma.ticket.count({ where: { itPriority: 'HIGH' } }));
    expect(result.body.metrics.byStatus.OPEN).toBe(await prisma.ticket.count({ where: { currentStatus: 'OPEN' } }));
    for (const status of ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'] as const) expect(result.body.metrics.byStatus[status]).toBe(await prisma.ticket.count({ where: { currentStatus: status } }));
    for (const priority of ['LOW', 'MEDIUM', 'HIGH'] as const) expect(result.body.metrics.byPriority[priority]).toBe(await prisma.ticket.count({ where: { itPriority: priority } }));
    expect(result.body.recentTickets).toHaveLength(5);
    for (let i = 1; i < 5; i++) expect(new Date(result.body.recentTickets[i - 1].updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(result.body.recentTickets[i].updatedAt).getTime());
    expect(result.body.recentTickets.every((item: { href: string; id: string }) => item.href === `/staff/tickets/${item.id}`)).toBe(true);
    const drillDown = await request(app).get('/api/staff/tickets?actionAssignee=me').set(headers[1]);
    expect(drillDown.status).toBe(200);
    expect(drillDown.body.data.some((item: { id: string }) => item.id === ticketIds[1])).toBe(true);
    expect(drillDown.body.meta.totalItems).toBe(1);
    expect(drillDown.body.data.map((row: { id: string }) => row.id)).toEqual([ticketIds[1]]);
  });
  it('owner/open drill-down matches counts and retains combined status/priority scopes', async () => {
    const dashboard = (await request(app).get('/api/dashboard/staff').set(headers[1])).body;
    for (const [owner, metric] of [['unassigned', 'unassigned'], ['me', 'myOwned']] as const) {
      const response = await request(app).get(`/api/staff/tickets?owner=${owner}&status=open`).set(headers[1]);
      expect(response.status).toBe(200); expect(response.body.meta.totalItems).toBe(dashboard.metrics[metric]);
      expect(response.body.data.every((row: { currentStatus: typeof open[number] }) => open.includes(row.currentStatus))).toBe(true);
    }
    for (const query of ['status=open&currentStatus=CLOSED', 'actionAssignee=me&currentStatus=CLOSED', 'actionAssignee=me&itPriority=HIGH', 'actionAssignee=me&owner=unassigned']) {
      const response = await request(app).get('/api/staff/tickets?' + query).set(headers[1]); expect(response.status).toBe(200); expect(response.body.meta.totalItems).toBe(0);
    }
    const admin = await request(app).get('/api/staff/tickets?actionAssignee=me').set(headers[2]);
    expect(admin.body.data.map((row: { id: string }) => row.id)).toEqual([ticketIds[5]]);
    expect((await request(app).get('/api/staff/eligible-owners').set(headers[2])).status).toBe(403);
  });
  it.each(['status=closed', 'status=open&status=open', 'actionAssignee=other', 'actionAssignee=me&actionAssignee=me', 'actionAssignee[x]=me'])('rejects invalid scope %s', async query => {
    expect((await request(app).get('/api/staff/tickets?' + query).set(headers[1])).status).toBe(400);
  });
  it('recent Staff rows obey the UTC window, five-row limit and ID tie ordering', async () => {
    const now = new Date(); const start = new Date(now.getTime() - 7 * 86400_000);
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now);
    const originals = await prisma.ticket.findMany({ where: { id: { in: ticketIds } }, select: { id: true, updatedAt: true } });
    try {
      for (let i = 0; i < ticketIds.length; i++) await prisma.ticket.update({ where: { id: ticketIds[i] }, data: { updatedAt: i === 5 ? new Date(start.getTime() - 1) : i === 6 ? new Date(now.getTime() + 1) : now } });
      const result = await request(app).get('/api/dashboard/staff').set(headers[1]);
      expect(result.body.asOf).toBe(now.toISOString()); expect(result.body.windowStart).toBe(start.toISOString());
      const expected = await prisma.ticket.findMany({ where: { updatedAt: { gte: start, lte: now } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 5, select: { id: true } });
      expect(result.body.recentTickets.map((row: { id: string }) => row.id)).toEqual(expected.map(row => row.id));
      expect(result.body.recentTickets.map((row: { id: string }) => row.id)).toEqual(ticketIds.slice(0, 5).sort().reverse());
      expect(Object.keys(result.body.recentTickets[0]).sort()).toEqual(['id', 'ticketNumber', 'summary', 'currentStatus', 'itPriority', 'updatedAt', 'href'].sort());
    } finally { vi.useRealTimers(); for (const row of originals) await prisma.ticket.update({ where: { id: row.id }, data: { updatedAt: row.updatedAt } }); }
  });
  it.each(['requester', 'staff'])('redacts database failures without returning partial %s metrics', async role => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('private SQL and credentials'));
    const result = await request(app).get('/api/dashboard/' + role).set(headers[role === 'requester' ? 0 : 1]);
    expect(result.status).toBe(503); expect(result.body.error.code).toBe('DASHBOARD_UNAVAILABLE');
    expect(result.body.metrics).toBeUndefined(); expect(result.text).not.toContain('private SQL'); expect(JSON.stringify(log.mock.calls)).not.toContain('credentials');
  });
  it('allows Admin but denies Requester and unsupported filters', async () => {
    expect((await request(app).get('/api/dashboard/staff').set(headers[2])).status).toBe(200);
    expect((await request(app).get('/api/dashboard/staff').set(headers[0])).status).toBe(403);
    expect((await request(app).get('/api/dashboard/staff?owner=me').set(headers[1])).status).toBe(400);
    expect((await request(app).get('/api/dashboard/requester').set(headers[2])).status).toBe(403);
    expect((await request(app).get('/api/staff/tickets?actionAssignee=me').set(headers[0])).status).toBe(403);
  });
});
