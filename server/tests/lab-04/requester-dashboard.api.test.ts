import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { fixtureCredential, sessionHeaders } from '../session-fixture.js';

const ids = [randomUUID(), randomUUID(), randomUUID()];
const prefix = `L4-DASH-${randomUUID()}`;
const headers: Awaited<ReturnType<typeof sessionHeaders>>[] = [];
const ticketIds: string[] = [];
let categoryId: number, systemId: number;
const now = new Date('2026-10-09T10:00:00.000Z');
const start = new Date(now.getTime() - 7 * 86400_000);
const realTransaction = prisma.$transaction.bind(prisma);
beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now);
  categoryId = (await prisma.category.create({ data: { name: prefix } })).id;
  systemId = (await prisma.relatedSystem.create({ data: { name: prefix } })).id;
  for (let i = 0; i < ids.length; i++) {
    await prisma.user.create({ data: { id: ids[i], name: `Dashboard ${i}`, email: `${ids[i]}@example.test`, role: i === 2 ? 'IT_STAFF' : 'REQUESTER', ...fixtureCredential } });
    headers.push(await sessionHeaders(ids[i]));
  }
  const statuses = ['NEW', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN', 'IN_PROGRESS', 'REOPENED'] as const;
  for (let i = 0; i < statuses.length; i++) {
    const row = await prisma.ticket.create({ data: {
      ticketNumber: `${prefix}-${i}`, requesterId: ids[0], categoryId, relatedSystemId: systemId,
      summary: `Dashboard ticket ${i}`, description: 'Synthetic dashboard fixture',
      requestedPriority: 'MEDIUM', itPriority: 'MEDIUM', currentStatus: statuses[i],
      updatedAt: i === 3 ? new Date(start.getTime() - 1) : i === 4 ? new Date(now.getTime() + 1) : i === 5 ? start : now,
    } });
    ticketIds.push(row.id);
  }
  ticketIds.push((await prisma.ticket.create({ data: { ticketNumber: `${prefix}-foreign`, requesterId: ids[1], categoryId, relatedSystemId: systemId, summary: 'Other requester', description: 'Must not leak', requestedPriority: 'HIGH', itPriority: 'HIGH' } })).id);
});
afterEach(() => { vi.restoreAllMocks(); prisma.$transaction = realTransaction; });
afterAll(async () => {
  if (ticketIds.length) await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  if (systemId) await prisma.relatedSystem.delete({ where: { id: systemId } });
  vi.useRealTimers();
});

describe('Requester dashboard', () => {
  it('returns exact owned metrics and never includes another requester’s Ticket', async () => {
    const result = await request(app).get('/api/dashboard/requester').set(headers[0]);
    expect(result.status).toBe(200);
    expect(result.body.metrics).toEqual({ open: 5, waitingForRequester: 1, recentlyUpdated: 6, recentlyResolved: 1 });
    expect(result.body.recentTickets).toHaveLength(5);
    expect(result.text).not.toContain(ticketIds[8]);
    expect(result.text).not.toContain('itPriority');
    expect(Object.keys(result.body)).toEqual(['asOf', 'windowStart', 'metrics', 'recentTickets']);
    expect(result.body.asOf).toBe(now.toISOString()); expect(result.body.windowStart).toBe(start.toISOString());
    const expected = ticketIds.filter((_, i) => [0, 1, 2, 6, 7].includes(i)).sort().reverse();
    expect(result.body.recentTickets.map((row: { id: string }) => row.id)).toEqual(expected);
    expect(Object.keys(result.body.recentTickets[0]).sort()).toEqual(['id', 'ticketNumber', 'summary', 'currentStatus', 'updatedAt', 'href'].sort());
    expect(result.body.recentTickets.every((item: { href: string; id: string }) => item.href === `/tickets/${item.id}`)).toBe(true);
  });
  it('open list drill-down matches the metric and intersects exact status safely', async () => {
    const result = await request(app).get('/api/tickets?status=open').set(headers[0]);
    expect(result.status).toBe(200); expect(result.body.meta.totalItems).toBe(5);
    expect(result.body.data.map((row: { id: string }) => row.id).sort()).toEqual([0, 1, 5, 6, 7].map(i => ticketIds[i]).sort());
    const empty = await request(app).get('/api/tickets?status=open&currentStatus=RESOLVED').set(headers[0]);
    expect(empty.status).toBe(200); expect(empty.body.meta.totalItems).toBe(0);
    for (const query of ['status=closed', 'status=open&status=open', 'status[x]=open']) expect((await request(app).get('/api/tickets?' + query).set(headers[0])).status).toBe(400);
  });
  it('returns zeros for an owned empty account', async () => {
    const emptyId = randomUUID();
    await prisma.user.create({ data: { id: emptyId, name: prefix, email: `${emptyId}@example.test`, role: 'REQUESTER', ...fixtureCredential } });
    try {
      const response = await request(app).get('/api/dashboard/requester').set(await sessionHeaders(emptyId));
      expect(response.status).toBe(200); expect(response.body.metrics).toEqual({ open: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 }); expect(response.body.recentTickets).toEqual([]);
    } finally { await prisma.authSession.deleteMany({ where: { userId: emptyId } }); await prisma.user.delete({ where: { id: emptyId } }); }
  });
  it('keeps one repeatable-read snapshot while another transaction changes a Ticket', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementationOnce(((callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel: Prisma.TransactionIsolationLevel }) => {
      expect(options.isolationLevel).toBe('RepeatableRead');
      return realTransaction(async tx => {
        // Establish the actual PostgreSQL snapshot, then commit an independent write.
        await tx.ticket.count();
        await prisma.ticket.update({ where: { id: ticketIds[0] }, data: { currentStatus: 'RESOLVED' } });
        return callback(tx);
      }, options);
    }) as typeof prisma.$transaction);
    try {
      const response = await request(app).get('/api/dashboard/requester').set(headers[0]);
      expect(response.status).toBe(200); expect(response.body.metrics.open).toBe(5); expect(response.body.metrics.recentlyResolved).toBe(1);
      expect(response.body.recentTickets.find((row: { id: string }) => row.id === ticketIds[0]).currentStatus).toBe('NEW');
      expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketIds[0] } })).currentStatus).toBe('RESOLVED');
    } finally { await prisma.ticket.update({ where: { id: ticketIds[0] }, data: { currentStatus: 'NEW', updatedAt: now } }); }
  });
  it('uses role checks and rejects unsupported filters', async () => {
    expect((await request(app).get('/api/dashboard/requester').set(headers[2])).status).toBe(403);
    expect((await request(app).get('/api/dashboard/requester?requesterId=' + ids[1]).set(headers[0])).status).toBe(400);
    expect((await request(app).get('/api/dashboard/requester')).status).toBe(401);
  });
});
