import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { fixtureCredential, sessionHeaders } from '../session-fixture.js';

const ids = Array.from({ length: 5 }, () => randomUUID());
const roles = ['REQUESTER', 'REQUESTER', 'IT_STAFF', 'ADMINISTRATOR', 'IT_STAFF'] as const;
const headers: Awaited<ReturnType<typeof sessionHeaders>>[] = [];
const prefix = `L4-${randomUUID()}`;
let categoryId: number, systemId: number, ticketId: string;
const input = () => ({ actionAt: new Date().toISOString(), description: 'Check the VPN client', result: '', assignedToId: ids[2], followUpRequired: true, followUpNote: 'Ask requester to verify', attachmentNotes: 'Review the VPN screenshot' });
const endpoint = () => `/api/tickets/${ticketId}/actions`;
const create = (actor = 2, key = randomUUID(), body = input()) => request(app).post(endpoint()).set(headers[actor]).set('Idempotency-Key', key).send(body);
const clearActions = async () => {
  await prisma.actionRevision.deleteMany({ where: { action: { ticketId } } });
  await prisma.actionCreateRequest.deleteMany({ where: { action: { ticketId } } });
  await prisma.actionTaken.deleteMany({ where: { ticketId } });
};
beforeAll(async () => {
  categoryId = (await prisma.category.create({ data: { name: prefix } })).id;
  systemId = (await prisma.relatedSystem.create({ data: { name: prefix } })).id;
  for (let i = 0; i < ids.length; i++) {
    await prisma.user.create({ data: { id: ids[i], name: `Lab 4 ${i}`, email: `${ids[i]}@example.test`, role: roles[i], isActive: i !== 4, ...fixtureCredential } });
    headers.push(await sessionHeaders(ids[i]));
  }
  ticketId = (await prisma.ticket.create({ data: { ticketNumber: prefix, requesterId: ids[0], ownerId: ids[2], categoryId, relatedSystemId: systemId, summary: 'VPN is unavailable', description: 'The VPN cannot connect.', requestedPriority: 'HIGH', itPriority: 'HIGH', currentStatus: 'IN_PROGRESS' } })).id;
});
beforeEach(async () => {
  await clearActions();
  await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: 'IN_PROGRESS', ownerId: ids[2], version: 1 } });
});
afterAll(async () => {
  if (ticketId) { await clearActions(); await prisma.ticket.delete({ where: { id: ticketId } }); }
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  if (systemId) await prisma.relatedSystem.delete({ where: { id: systemId } });
});

describe('Actions Taken API', () => {
  it('records a staff Action and exposes it read-only to its owning Requester', async () => {
    const added = await create();
    expect(added.status).toBe(201);
    expect(added.body.data).toMatchObject({ ticketId, status: 'PLANNED', version: 1, createdBy: { id: ids[2] }, performedBy: { id: ids[2] }, assignedTo: { id: ids[2] } });
    const owned = await request(app).get(endpoint()).set(headers[0]);
    expect(owned.status).toBe(200); expect(owned.body.data).toHaveLength(1);
    expect((await request(app).get(endpoint()).set(headers[1])).status).toBe(404);
    expect((await create(0)).status).toBe(403);
    expect((await create(3)).status).toBe(201);
    expect((await request(app).get(`${endpoint()}/${added.body.data.id}`).set(headers[0])).body).not.toHaveProperty('revisions');
  });
  it('rejects invalid follow-up, inactive assignee and actor overrides without partial rows', async () => {
    expect((await create(2, randomUUID(), { ...input(), followUpNote: '' })).body.error.fieldErrors).toHaveProperty('followUpNote');
    expect((await create(2, randomUUID(), { ...input(), assignedToId: ids[4] })).body.error.code).toBe('ASSIGNEE_NOT_ELIGIBLE');
    expect((await request(app).post(endpoint()).set(headers[2]).set('Idempotency-Key', randomUUID()).send({ ...input(), createdById: ids[1] })).status).toBe(400);
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(0);
  });
  it('replays duplicate create and rejects a reused key with changed data', async () => {
    const key = randomUUID(), body = input();
    const first = await create(2, key, body), replay = await create(2, key, body);
    expect(first.status).toBe(201); expect(replay.status).toBe(200);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body.data.id).toBe(first.body.data.id);
    expect((await create(2, key, { ...body, description: 'A different task' })).body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(1);
  });
  it('edits and completes with version checks and immutable ordered revisions', async () => {
    const added = await create(); const actionId = added.body.data.id;
    const edited = await request(app).patch(`${endpoint()}/${actionId}`).set(headers[3]).send({ ...input(), description: 'Reinstall the VPN client', result: 'Connection works', expectedVersion: 1 });
    expect(edited.status).toBe(200); expect(edited.body.data).toMatchObject({ version: 2, performedBy: { id: ids[3] } });
    expect((await request(app).patch(`${endpoint()}/${actionId}`).set(headers[2]).send({ ...input(), expectedVersion: 1 })).body.error.code).toBe('ACTION_CONFLICT');
    const completed = await request(app).patch(`${endpoint()}/${actionId}/status`).set(headers[2]).send({ status: 'COMPLETED', result: 'Connection works', expectedVersion: 2 });
    expect(completed.status).toBe(200); expect(completed.body.data).toMatchObject({ status: 'COMPLETED', version: 3 });
    expect((await request(app).patch(`${endpoint()}/${actionId}`).set(headers[2]).send({ ...input(), expectedVersion: 3 })).body.error.code).toBe('ACTION_READ_ONLY');
    const detail = await request(app).get(`${endpoint()}/${actionId}`).set(headers[3]);
    expect(detail.body.revisions.map((item: { operation: string }) => item.operation)).toEqual(['CREATED', 'EDITED', 'COMPLETED']);
  });
  it('allows exactly one competing update at the same version', async () => {
    const id = (await create()).body.data.id;
    const results = await Promise.all([2, 3].map(actor => request(app).patch(`${endpoint()}/${id}`).set(headers[actor]).send({ ...input(), description: `Update by ${actor}`, expectedVersion: 1 })));
    expect(results.map(item => item.status).sort()).toEqual([200, 409]);
    expect(await prisma.actionRevision.count({ where: { actionId: id } })).toBe(2);
  });
  it.each([2, 3])('lets actor %i Start and records the authenticated performer and STARTED snapshot', async actor => {
    const id = (await create()).body.data.id;
    const started = await request(app).patch(`${endpoint()}/${id}/status`).set(headers[actor]).send({ status: 'IN_PROGRESS', expectedVersion: 1 });
    expect(started.status).toBe(200);
    expect(started.body.data).toMatchObject({ status: 'IN_PROGRESS', version: 2, performedBy: { id: ids[actor] }, createdBy: { id: ids[2] } });
    const detail = await request(app).get(`${endpoint()}/${id}`).set(headers[actor]);
    expect(detail.body.revisions.map((revision: { operation: string }) => revision.operation)).toEqual(['CREATED', 'STARTED']);
    expect(detail.body.revisions[1]).toMatchObject({ actor: { id: ids[actor] }, snapshot: { status: 'IN_PROGRESS', version: 2, performedById: ids[actor] } });
    expect((await request(app).patch(`${endpoint()}/${id}/status`).set(headers[actor]).send({ status: 'IN_PROGRESS', expectedVersion: 2 })).body.error.code).toBe('INVALID_ACTION_TRANSITION');
  });
  it('allows one competing Start and preserves the winning revision', async () => {
    const id = (await create()).body.data.id;
    const results = await Promise.all([2, 3].map(actor => request(app).patch(`${endpoint()}/${id}/status`).set(headers[actor]).send({ status: 'IN_PROGRESS', expectedVersion: 1 })));
    expect(results.map(item => item.status).sort()).toEqual([200, 409]);
    expect(results.find(item => item.status === 409)?.body.error.code).toBe('ACTION_CONFLICT');
    expect(await prisma.actionRevision.count({ where: { actionId: id, operation: 'STARTED' } })).toBe(1);
  });
  it.each(['CLOSED', 'CANCELLED'] as const)('rejects all writes on %s Tickets while retaining reads', async status => {
    const id = (await create()).body.data.id;
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: status } });
    expect((await create()).body.error.code).toBe('ACTION_READ_ONLY');
    for (const actor of [2, 3]) {
      expect((await request(app).patch(`${endpoint()}/${id}`).set(headers[actor]).send({ ...input(), expectedVersion: 1 })).body.error.code).toBe('ACTION_READ_ONLY');
      expect((await request(app).patch(`${endpoint()}/${id}/status`).set(headers[actor]).send({ status: 'IN_PROGRESS', expectedVersion: 1 })).body.error.code).toBe('ACTION_READ_ONLY');
    }
    expect((await request(app).get(`${endpoint()}/${id}`).set(headers[0])).status).toBe(200);
    expect(await prisma.actionRevision.count({ where: { actionId: id } })).toBe(1);
  });
  it.each(['COMPLETED', 'CANCELLED'] as const)('keeps %s Actions immutable', async status => {
    const id = (await create()).body.data.id;
    expect((await request(app).patch(`${endpoint()}/${id}/status`).set(headers[3]).send({ status, expectedVersion: 1, ...(status === 'COMPLETED' ? { result: 'Verified recovery' } : {}) })).status).toBe(200);
    expect((await request(app).patch(`${endpoint()}/${id}/status`).set(headers[2]).send({ status: 'IN_PROGRESS', expectedVersion: 2 })).body.error.code).toBe('ACTION_READ_ONLY');
    expect(await prisma.actionRevision.count({ where: { actionId: id } })).toBe(2);
  });
  it('lists active Staff/Admin assignees only and denies Requester access', async () => {
    const response = await request(app).get(`${endpoint()}/eligible-assignees`).set(headers[3]);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: ids[2] }), expect.objectContaining({ id: ids[3] })]));
    for (const id of [ids[0], ids[1], ids[4]]) expect(response.body.data.map((row: { id: string }) => row.id)).not.toContain(id);
    expect((await request(app).get(`${endpoint()}/eligible-assignees`).set(headers[0])).status).toBe(403);
    expect((await create(2, randomUUID(), { ...input(), assignedToId: ids[3] })).status).toBe(201);
  });
  it('does not leak non-owned or mismatched Action details and rejects Requester mutations', async () => {
    const id = (await create()).body.data.id;
    const missing = await request(app).get(`/api/tickets/${randomUUID()}/actions/${id}`).set(headers[0]);
    const other = await request(app).get(`${endpoint()}/${id}`).set(headers[1]);
    expect(missing.status).toBe(404); expect(other.body).toEqual(missing.body);
    expect((await request(app).get(`${endpoint()}/${randomUUID()}`).set(headers[2])).status).toBe(404);
    for (const actor of [0, 1]) {
      expect((await request(app).patch(`${endpoint()}/${id}`).set(headers[actor]).send({ ...input(), expectedVersion: 1 })).status).toBe(403);
      expect((await request(app).patch(`${endpoint()}/${id}/status`).set(headers[actor]).send({ status: 'IN_PROGRESS', expectedVersion: 1 })).status).toBe(403);
    }
  });
  it('normalizes Unicode and clears disabled follow-up; rejects invalid calendar dates and completion results', async () => {
    const added = await create(2, randomUUID(), { ...input(), actionAt: '2026-10-06T15:00:00+07:00', description: '  Cafe\u0301\r\nclient  ', followUpRequired: false, followUpNote: 'discard me' });
    expect(added.status).toBe(201);
    expect(added.body.data).toMatchObject({ actionAt: '2026-10-06T08:00:00.000Z', description: 'Café\nclient', followUpNote: '' });
    for (const value of ['2026-02-31T09:00:00Z', '2026-10-06T09:00:00', 'not a date']) {
      expect((await create(2, randomUUID(), { ...input(), actionAt: value })).status).toBe(400);
    }
    expect((await create(2, randomUUID(), { ...input(), description: '🙂'.repeat(2000) })).status).toBe(201);
    expect((await create(2, randomUUID(), { ...input(), description: '🙂'.repeat(2001) })).status).toBe(400);
    expect((await request(app).patch(`${endpoint()}/${added.body.data.id}/status`).set(headers[2]).send({ status: 'COMPLETED', expectedVersion: 1, result: '  ' })).status).toBe(400);
  });
  it('paginates in stable date/ID order and rejects malformed queries', async () => {
    await prisma.actionTaken.createMany({ data: Array.from({ length: 12 }, () => ({ id: randomUUID(), ticketId, assignedToId: ids[2], createdById: ids[2], performedById: ids[2], actionAt: new Date('2026-10-06T00:00:00Z'), description: 'Same-time fixture' })) });
    const first = await request(app).get(`${endpoint()}?page=1&pageSize=10`).set(headers[0]);
    const second = await request(app).get(`${endpoint()}?page=2&pageSize=10`).set(headers[0]);
    expect(first.body.meta).toMatchObject({ totalItems: 12, totalPages: 2 });
    expect(first.body.data).toHaveLength(10); expect(second.body.data).toHaveLength(2);
    const resultIds = [...first.body.data, ...second.body.data].map((item: { id: string }) => item.id);
    expect(resultIds).toEqual([...resultIds].sort());
    for (const query of ['page=0', 'pageSize=11', 'page=2147483648', 'page=1&page=2', 'sort=desc']) expect((await request(app).get(`${endpoint()}?${query}`).set(headers[0])).status).toBe(400);
  });
  it('rejects unknown identity/status overrides, missing CSRF/session and simultaneous duplicate creates', async () => {
    for (const field of ['performedById', 'ticketId', 'status', 'createdAt']) expect((await create(2, randomUUID(), { ...input(), [field]: ids[0] })).status).toBe(400);
    expect((await request(app).post(endpoint()).set('Idempotency-Key', randomUUID()).send(input())).status).toBe(401);
    expect((await request(app).post(endpoint()).set('Cookie', headers[2].Cookie).set('Idempotency-Key', randomUUID()).send(input())).status).toBe(403);
    const key = randomUUID(), body = input();
    const results = await Promise.all([create(2, key, body), create(2, key, body)]);
    expect(results.map(row => row.status).sort()).toEqual([200, 201]);
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(1);
  });
});
