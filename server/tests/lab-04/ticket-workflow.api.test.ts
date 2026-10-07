import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ActionStatus } from '@prisma/client';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { fixtureCredential, sessionHeaders } from '../session-fixture.js';
import { lockAccounts } from '../../src/account-lock.js';

const ids = Array.from({ length: 4 }, () => randomUUID());
const headers: Awaited<ReturnType<typeof sessionHeaders>>[] = [];
let ticketId: string, categoryId: number, systemId: number;
const prefix = `L4-WORKFLOW-${randomUUID()}`;
const detail = (actor = 1) => request(app).get(`/api/staff/tickets/${ticketId}`).set(headers[actor]);
const resolve = (version = 1, actor = 1) => request(app).patch(`/api/staff/tickets/${ticketId}/status`).set(headers[actor]).send({ currentStatus: 'RESOLVED', expectedVersion: version, confirmed: true });
const action = (status: ActionStatus, result = '') => prisma.actionTaken.create({ data: { ticketId, actionAt: new Date(), description: 'Synthetic Action gate fixture', status, result, assignedToId: ids[2], createdById: ids[1], performedById: ids[2] } });
const clearActions = async () => {
  await prisma.actionRevision.deleteMany({ where: { action: { ticketId } } });
  await prisma.actionCreateRequest.deleteMany({ where: { action: { ticketId } } });
  await prisma.actionTaken.deleteMany({ where: { ticketId } });
};
beforeAll(async () => {
  categoryId = (await prisma.category.create({ data: { name: prefix } })).id;
  systemId = (await prisma.relatedSystem.create({ data: { name: prefix } })).id;
  for (const [index, role] of (['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR', 'IT_STAFF'] as const).entries()) {
    await prisma.user.create({ data: { id: ids[index], name: `Workflow ${index}`, email: `${ids[index]}@example.test`, role, ...fixtureCredential } });
    headers.push(await sessionHeaders(ids[index]));
  }
  ticketId = (await prisma.ticket.create({ data: { ticketNumber: prefix, requesterId: ids[0], ownerId: ids[1], categoryId, relatedSystemId: systemId, summary: prefix, description: 'Synthetic resolution fixture', requestedPriority: 'MEDIUM', itPriority: 'HIGH', currentStatus: 'IN_PROGRESS' } })).id;
});
beforeEach(async () => {
  await clearActions();
  await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: 'IN_PROGRESS', ownerId: ids[1], version: 1, requesterResolvedAt: null } });
});
afterAll(async () => {
  if (ticketId) { await clearActions(); await prisma.ticket.delete({ where: { id: ticketId } }); }
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  if (systemId) await prisma.relatedSystem.delete({ where: { id: systemId } });
});

describe('API-05 resolution gate and retained authority', () => {
  it('blocks zero Actions without changing any Ticket fields', async () => {
    const before = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    expect((await detail()).body.data.resolutionGate).toEqual({ ready: false, unfinished: 0, completedWithResult: 0 });
    const response = await resolve(); expect(response.status).toBe(409); expect(response.body.error.code).toBe('ACTIONS_INCOMPLETE');
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).toEqual(before);
  });
  it.each(['PLANNED', 'IN_PROGRESS'] as const)('blocks an unfinished %s even with a documented completion', async status => {
    await action('COMPLETED', 'Restored service'); await action(status, 'Not a completed result');
    expect((await detail()).body.data.resolutionGate).toEqual({ ready: false, unfinished: 1, completedWithResult: 1 });
    expect((await resolve()).body.error.code).toBe('ACTIONS_INCOMPLETE');
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).version).toBe(1);
  });
  it.each(['', ' \t\r\n', '\u00a0\u2003\u202f\ufeff'])('rejects a blank historical completed Result %#', async result => {
    await action('COMPLETED', result); await action('CANCELLED', 'Cancelled work is not a completion');
    expect((await detail()).body.data.resolutionGate.completedWithResult).toBe(0);
    expect((await resolve()).body.error.code).toBe('ACTIONS_INCOMPLETE');
  });
  it('accepts a documented completion plus cancelled Actions and preserves history through close/reopen', async () => {
    const completed = await action('COMPLETED', ' \u00a0Service restored\u2003 '); await action('CANCELLED');
    await prisma.actionRevision.create({ data: { actionId: completed.id, actorId: ids[2], operation: 'COMPLETED', snapshot: { result: completed.result } } });
    expect((await detail(2)).body.data.resolutionGate).toEqual({ ready: true, unfinished: 0, completedWithResult: 1 });
    expect((await resolve()).status).toBe(200);
    const actions = await prisma.actionTaken.findMany({ where: { ticketId }, orderBy: { id: 'asc' } });
    for (const [currentStatus, expectedVersion] of [['CLOSED', 2], ['REOPENED', 3]] as const) {
      const response = await request(app).patch(`/api/staff/tickets/${ticketId}/status`).set(headers[1]).send({ currentStatus, expectedVersion, confirmed: true });
      expect(response.status).toBe(200); expect(response.body.data.currentStatus).toBe(currentStatus);
    }
    expect(await prisma.actionTaken.findMany({ where: { ticketId }, orderBy: { id: 'asc' } })).toEqual(actions);
    expect(await prisma.actionRevision.count({ where: { actionId: completed.id } })).toBe(1);
  });
  it('keeps Requester indication advisory and excludes operational readiness from its DTO', async () => {
    const indicated = await request(app).post(`/api/tickets/${ticketId}/resolution-indication`).set(headers[0]).send({ expectedVersion: 1 });
    expect(indicated.status).toBe(200); expect(indicated.body.data.currentStatus).toBe('IN_PROGRESS');
    expect(indicated.body.data).not.toHaveProperty('resolutionGate');
    expect((await resolve(2)).body.error.code).toBe('ACTIONS_INCOMPLETE');
    expect((await resolve(2, 0)).status).toBe(403); expect((await resolve(2, 2)).status).toBe(403);
    expect((await detail(0)).status).toBe(403);
  });
  it('retains version, owner and confirmation precedence before the Action gate', async () => {
    expect((await resolve(99)).body.error.code).toBe('TICKET_CONFLICT');
    expect((await request(app).patch(`/api/staff/tickets/${ticketId}/status`).set(headers[1]).send({ currentStatus: 'RESOLVED', expectedVersion: 1 })).status).toBe(400);
    await prisma.ticket.update({ where: { id: ticketId }, data: { ownerId: null } });
    expect((await resolve()).body.error.code).toBe('ACTIVE_OWNER_REQUIRED');
  });
  it.each(['commit', 'rollback'] as const)('rechecks Actions after a competing transaction %s while holding shared locks', async outcome => {
    await action('COMPLETED', 'Service restored');
    let unlock!: () => void, locked!: () => void;
    const gate = new Promise<void>(resolve => { unlock = resolve; });
    const ready = new Promise<void>(resolve => { locked = resolve; });
    const competing = prisma.$transaction(async tx => {
      await lockAccounts(tx); await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${ticketId} FOR UPDATE`;
      await tx.actionTaken.create({ data: { ticketId, assignedToId: ids[2], createdById: ids[2], performedById: ids[2], actionAt: new Date(), description: 'Concurrent unfinished Action', status: 'PLANNED' } });
      locked(); await gate;
      if (outcome === 'rollback') throw new Error('Intentional fixture rollback');
    }).then(() => undefined, error => { if (outcome !== 'rollback') throw error; });
    await ready;
    const pending = resolve().then(response => response);
    try {
      let waiting = false; const deadline = Date.now() + 3000;
      while (!waiting && Date.now() < deadline) {
        const [row] = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND classid = 334 AND objid = 3 AND NOT granted) AS waiting`;
        waiting = row.waiting;
      }
      expect(waiting).toBe(true);
    } finally { unlock(); await competing; }
    const response = await pending;
    expect(response.status).toBe(outcome === 'commit' ? 409 : 200);
    if (outcome === 'commit') expect(response.body.error.code).toBe('ACTIONS_INCOMPLETE');
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).currentStatus).toBe(outcome === 'commit' ? 'IN_PROGRESS' : 'RESOLVED');
  });
});
