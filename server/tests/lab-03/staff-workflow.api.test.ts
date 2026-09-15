import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { TicketStatus } from '@prisma/client';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { fixtureCredential, sessionHeaders } from '../session-fixture.js';
import { lockAccounts } from '../../src/account-lock.js';

const roles = ['REQUESTER', 'REQUESTER', 'IT_STAFF', 'IT_STAFF', 'ADMINISTRATOR', 'IT_STAFF'] as const;
const ids = roles.map(() => randomUUID());
const headers: Awaited<ReturnType<typeof sessionHeaders>>[] = [];
const prefix = `WF-${randomUUID()}`;
let categoryId: number, relatedSystemId: number, ticketId: string;
const ticketIds: string[] = [];
beforeAll(async () => {
  categoryId = (await prisma.category.create({ data: { name: prefix } })).id;
  relatedSystemId = (await prisma.relatedSystem.create({ data: { name: prefix } })).id;
  for (let i = 0; i < ids.length; i++) {
    await prisma.user.create({ data: { id: ids[i], role: roles[i], name: `Workflow ${i}`, email: `${ids[i]}@example.test`, isActive: i !== 5, ...fixtureCredential } });
    headers.push(await sessionHeaders(ids[i]));
  }
  for (let i = 0; i < 14; i++) ticketIds.push((await prisma.ticket.create({ data: {
    ticketNumber: `${prefix}-${String(i).padStart(2, '0')}`, requesterId: ids[0], categoryId, relatedSystemId,
    summary: `Workflow printer ${i}`, description: 'Connection stalls at 50%_complete',
    requestedPriority: 'LOW', itPriority: i < 5 ? 'HIGH' : i < 10 ? 'MEDIUM' : 'LOW',
    ownerId: i % 2 ? ids[2] : null,
  } })).id);
  ticketId = ticketIds[0];
});
beforeEach(async () => {
  await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: 'NEW', ownerId: null, version: 1, itPriority: 'HIGH', requesterResolvedAt: null } });
});
afterAll(async () => {
  await prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  if (relatedSystemId) await prisma.relatedSystem.delete({ where: { id: relatedSystemId } });
});
const patch = (kind: string, body: object, actor = 2) => request(app).patch(`/api/staff/tickets/${ticketId}/${kind}`).set(headers[actor]).send({ expectedVersion: 1, ...body });
const queue = (query: string) => request(app).get(`/api/staff/tickets?categoryId=${categoryId}&${query}`).set(headers[2]);

describe('API-06 queue contract', () => {
  it('searches all fields, treats wildcard characters literally and ANDs owner/status/priority filters', async () => {
    for (const search of [prefix, 'printer', '50%_complete']) expect((await queue(`search=${encodeURIComponent(search)}`)).body.meta.totalItems).toBe(14);
    const filtered = await queue('itPriority=HIGH&owner=me&currentStatus=NEW');
    expect(filtered.body.meta.totalItems).toBe(2); expect(filtered.body.data.every((t: { owner: { id: string } }) => t.owner.id === ids[2])).toBe(true);
    expect((await queue('owner=unassigned')).body.meta.totalItems).toBe(7);
    expect((await queue(`owner=${ids[2]}`)).body.meta.totalItems).toBe(7);
    expect((await queue('search=not-found-here')).body.meta.totalPages).toBe(0);
    expect((await queue('search=%20%20')).body.meta.totalItems).toBe(14);
  });
  it.each(['asc', 'desc'])('sorts priority by business rank with stable ties and true pages: %s', async sortDirection => {
    const response = await queue(`sortBy=itPriority&sortDirection=${sortDirection}`);
    expect(response.status).toBe(200); expect(response.body.data).toHaveLength(10); expect(response.body.meta.totalPages).toBe(2);
    const second = await queue(`sortBy=itPriority&sortDirection=${sortDirection}&page=2`);
    const all = [...response.body.data, ...second.body.data];
    const ranks: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    for (let i = 1; i < all.length; i++) {
      if (all[i - 1].itPriority === all[i].itPriority) expect(all[i - 1].ticketNumber > all[i].ticketNumber).toBe(true);
      else expect(sortDirection === 'asc' ? ranks[all[i - 1].itPriority] < ranks[all[i].itPriority] : ranks[all[i - 1].itPriority] > ranks[all[i].itPriority]).toBe(true);
    }
    expect((await queue('page=3')).body).toMatchObject({ data: [], meta: { totalItems: 14, totalPages: 2 } });
  });
  it.each(['updatedAt', 'createdAt', 'ticketNumber'])('accepts deterministic sort %s', async sortBy => {
    const response = await queue(`sortBy=${sortBy}&sortDirection=asc`); expect(response.status).toBe(200);
    expect(new Set(response.body.data.map((t: { id: string }) => t.id)).size).toBe(10);
  });
  it.each(['owner=invalid', `owner=${randomUUID()}`, 'owner=me&owner=all', 'page=0', 'page=1.5', 'pageSize=11', 'page=99999999999999999', 'sortBy=requestedPriority', 'sortBy=nope', 'sortDirection=up', 'search=x&search=y', 'itPriority=urgent', 'requestedPriority=HIGH', 'currentStatus=BAD', 'extra=true'])('rejects invalid query %s', async value => {
    expect((await queue(value)).status).toBe(400);
  });
});
describe('API-05/07 safe detail and role matrix', () => {
  it('returns safe detail and active eligible owner choices only', async () => {
    const response = await request(app).get(`/api/staff/tickets/${ticketId}`).set(headers[2]);
    expect(response.status).toBe(200); expect(response.body.data.requester.id).toBe(ids[0]);
    expect(response.text).not.toMatch(/passwordHash|csrfToken|internalNotes|publicComments|tokenHash/);
    const owners = await request(app).get('/api/staff/eligible-owners').set(headers[2]);
    expect(owners.body.data.some((u: { id: string }) => u.id === ids[4])).toBe(true);
    expect(owners.body.data.some((u: { id: string }) => u.id === ids[0] || u.id === ids[5])).toBe(false);
  });
  it.each([0, 1, 4])('rejects staff-only mutation for role identity %i before ID/body validation', async actor => {
    for (const kind of ['owner', 'status']) expect((await request(app).patch(`/api/staff/tickets/not-a-uuid/${kind}`).set(headers[actor]).send({})).status).toBe(403);
    expect((await request(app).post('/api/staff/tickets/not-a-uuid/claim').set(headers[actor]).send({})).status).toBe(403);
    expect((await request(app).get('/api/staff/eligible-owners').set(headers[actor])).status).toBe(403);
  });
  it('rejects unauthenticated, restricted and missing-CSRF operations', async () => {
    expect((await request(app).get('/api/staff/tickets')).status).toBe(401);
    expect((await request(app).get('/api/staff/tickets?unknown=1').set(headers[0])).status).toBe(403);
    expect((await request(app).post(`/api/staff/tickets/${ticketId}/claim`).set('Cookie', headers[2].Cookie).send({ expectedVersion: 1 })).status).toBe(403);
    await prisma.user.update({ where: { id: ids[3] }, data: { mustChangePassword: true } });
    expect((await request(app).get('/api/staff/tickets').set(headers[3])).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    await prisma.user.update({ where: { id: ids[3] }, data: { mustChangePassword: false } });
  });
  it('allows Admin priority only, preserving requester priority', async () => {
    expect((await patch('priority', { itPriority: 'LOW' }, 4)).status).toBe(200);
    expect(await prisma.ticket.findUnique({ where: { id: ticketId } })).toMatchObject({ requestedPriority: 'LOW', itPriority: 'LOW', version: 2 });
    expect((await patch('priority', { itPriority: 'HIGH' }, 0)).status).toBe(403);
  });
});
describe('API-07/08 assignment and actual concurrency', () => {
  it('allows one of two competing claims and never overwrites the winner', async () => {
    const results = await Promise.all([2, 3].map(actor => request(app).post(`/api/staff/tickets/${ticketId}/claim`).set(headers[actor]).send({ expectedVersion: 1 })));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).version).toBe(2);
  });
  it('allows one competing priority update at the same version', async () => {
    const results = await Promise.all([patch('priority', { itPriority: 'LOW' }), patch('priority', { itPriority: 'MEDIUM' }, 4)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const winner = results.find(r => r.status === 200)!;
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).itPriority).toBe(winner.body.data.itPriority);
  });
  it.each([0, 5])('rejects ineligible owner %i', async index => {
    expect((await patch('owner', { ownerId: ids[index], confirmed: true })).body.error.code).toBe('OWNER_NOT_ELIGIBLE');
  });
  it('requires reassignment confirmation and prevents clearing in progress', async () => {
    expect((await patch('owner', { ownerId: ids[4], confirmed: false })).status).toBe(400);
    expect((await patch('owner', { ownerId: ids[4], confirmed: true })).status).toBe(200);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: 'IN_PROGRESS', version: 1 } });
    expect((await patch('owner', { ownerId: null, confirmed: true })).body.error.code).toBe('OWNER_CLEAR_NOT_ALLOWED');
  });
  it.each(['owner', 'start', 'resolve'])('rechecks eligibility after a competing account change holds the shared lock: %s', async operation => {
    if (operation !== 'owner') await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: operation === 'start' ? 'OPEN' : 'IN_PROGRESS', ownerId: ids[3] } });
    let unlock!: () => void, acquired!: () => void;
    const ready = new Promise<void>(resolve => { acquired = resolve; });
    const gate = new Promise<void>(resolve => { unlock = resolve; });
    const edit = prisma.$transaction(async tx => {
      await lockAccounts(tx); await tx.user.update({ where: { id: ids[3] }, data: { isActive: false } }); acquired(); await gate;
    });
    await ready;
    const assignment = (operation === 'owner' ? patch('owner', { ownerId: ids[3], confirmed: true }) : patch('status', { currentStatus: operation === 'start' ? 'IN_PROGRESS' : 'RESOLVED', confirmed: true })).then(r => r);
    try {
      let waiting = false; const deadline = Date.now() + 2000;
      while (!waiting && Date.now() < deadline) {
        const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND classid = 334 AND objid = 3 AND NOT granted) AS waiting`;
        waiting = rows[0].waiting;
      }
      expect(waiting).toBe(true);
    } finally { unlock(); await edit; }
    try { expect((await assignment).body.error.code).toBe(operation === 'owner' ? 'OWNER_NOT_ELIGIBLE' : 'ACTIVE_OWNER_REQUIRED'); }
    finally { await prisma.user.update({ where: { id: ids[3] }, data: { isActive: true } }); }
  });
});
// Deliberately independent expected matrix: do not import implementation rules.
const expected: Record<TicketStatus, TicketStatus[]> = { NEW: ['OPEN', 'CANCELLED'], OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'], IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'], WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'], RESOLVED: ['CLOSED', 'REOPENED'], CLOSED: ['REOPENED'], REOPENED: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'], CANCELLED: [] };
describe('API-09 all 64 status edges', () => {
  it.each(Object.values(TicketStatus).flatMap(from => Object.values(TicketStatus).map(to => [from, to] as const)))('%s → %s', async (from, to) => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: from, ownerId: ids[2] } });
    const result = await patch('status', { currentStatus: to, confirmed: true });
    const allowed = expected[from].includes(to);
    expect(result.status).toBe(allowed ? 200 : 409);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).currentStatus).toBe(allowed ? to : from);
  });
  it.each(['RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'])('requires explicit confirmation for %s', async currentStatus => {
    expect((await patch('status', { currentStatus })).status).toBe(400);
  });
  it.each(['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED'])('requires an active owner entering %s', async currentStatus => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: currentStatus === 'RESOLVED' ? 'IN_PROGRESS' : 'OPEN' } });
    expect((await patch('status', { currentStatus, confirmed: true })).body.error.code).toBe('ACTIVE_OWNER_REQUIRED');
  });
  it.each(['CLOSED', 'CANCELLED'] as const)('blocks priority and assignment in %s', async currentStatus => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus } });
    expect((await patch('priority', { itPriority: 'LOW' })).body.error.code).toBe('TICKET_READ_ONLY');
    expect((await patch('owner', { ownerId: ids[2], confirmed: true })).body.error.code).toBe('TICKET_READ_ONLY');
  });
});
describe('API-10 resolution indication', () => {
  it.each(Object.values(TicketStatus))('validates indication in %s without changing actual status', async currentStatus => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus } });
    const result = await request(app).post(`/api/tickets/${ticketId}/resolution-indication`).set(headers[0]).send({ expectedVersion: 1 });
    expect(result.status).toBe(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'].includes(currentStatus) ? 200 : 409);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).currentStatus).toBe(currentStatus);
  });
  it('supports current-version repeat, rejects stale/non-owner and clears on reopen', async () => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: 'OPEN' } });
    const indicate = (version: number, actor = 0, id = ticketId) => request(app).post(`/api/tickets/${id}/resolution-indication`).set(headers[actor]).send({ expectedVersion: version });
    const first = await indicate(1); expect(first.status).toBe(200);
    expect((await indicate(2)).body.data).toEqual(first.body.data);
    expect((await indicate(1)).status).toBe(409);
    expect((await indicate(2, 1)).body).toEqual((await indicate(2, 1, randomUUID())).body);
    expect((await indicate(2, 1)).status).toBe(404);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: 'CLOSED', version: 1 } });
    expect((await patch('status', { currentStatus: 'REOPENED', confirmed: true })).body.data.requesterResolvedAt).toBeNull();
  });
});
describe('API-11 append-only conversation privacy and validation', () => {
  it('normalizes plain text and author, hides private data and preserves operational version', async () => {
    const post = await request(app).post(`/api/tickets/${ticketId}/comments`).set(headers[0]).send({ content: '  e\u0301\r\n<script>alert(1)</script>  ' });
    expect(post.status).toBe(201); expect(post.body.data.content).toBe('é\n<script>alert(1)</script>');
    expect(post.body.data.author).toEqual({ id: ids[0], name: 'Workflow 0', role: 'REQUESTER' });
    expect(post.text).not.toMatch(/passwordHash|email|csrfToken/);
    const note = await request(app).post(`/api/tickets/${ticketId}/internal-notes`).set(headers[2]).send({ content: 'Private triage detail' }); expect(note.status).toBe(201);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).version).toBe(1);
    expect((await request(app).get(`/api/tickets/${ticketId}/comments`).set(headers[0])).text).not.toContain('Private triage detail');
    for (const id of [ticketId, randomUUID(), 'invalid']) expect((await request(app).get(`/api/tickets/${id}/internal-notes`).set(headers[0])).status).toBe(403);
    expect((await request(app).get(`/api/tickets/${ticketId}/internal-notes`).set(headers[4])).status).toBe(200);
    for (const suffix of ['comments', 'internal-notes']) {
      expect((await request(app).post(`/api/tickets/${ticketId}/${suffix}`).set(headers[4]).send({ content: 'Forbidden' })).status).toBe(403);
      expect((await request(app).delete(`/api/tickets/${ticketId}/${suffix}/${post.body.data.id}`).set(headers[2])).status).toBe(404);
    }
  });
  it.each([{ content: '' }, { content: '   ' }, { content: 'x'.repeat(2001) }, { content: 'hello', authorId: 'forged' }, { content: 123 }])('rejects invalid content %#', async body => {
    expect((await request(app).post(`/api/tickets/${ticketId}/comments`).set(headers[2]).send(body)).status).toBe(400);
  });
  it('paginates deterministically and does not reveal non-owned records before validation', async () => {
    const a = await request(app).get(`/api/tickets/${ticketId}/comments?unknown=true`).set(headers[1]);
    const b = await request(app).get(`/api/tickets/${randomUUID()}/comments?unknown=true`).set(headers[1]);
    expect(a.status).toBe(404); expect(a.body).toEqual(b.body);
    for (const query of ['page=1&page=2', 'pageSize=5', 'unknown=1']) expect((await request(app).get(`/api/tickets/${ticketId}/comments?${query}`).set(headers[2])).status).toBe(400);
    const when = new Date('2026-01-01');
    await prisma.publicComment.createMany({ data: Array.from({ length: 21 }, (_, i) => ({ id: randomUUID(), ticketId, authorId: ids[2], content: `Ordered ${i}`, createdAt: when })) });
    const first = await request(app).get(`/api/tickets/${ticketId}/comments?pageSize=10`).set(headers[0]);
    const second = await request(app).get(`/api/tickets/${ticketId}/comments?pageSize=10&page=2`).set(headers[0]);
    const all = [...first.body.data, ...second.body.data];
    expect(new Set(all.map(e => e.id)).size).toBe(20);
    expect(all.map(e => e.id)).toEqual(all.map(e => e.id).sort());
  });
  it.each(['CLOSED', 'CANCELLED'] as const)('retains history but blocks appends in %s', async currentStatus => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus } });
    for (const suffix of ['comments', 'internal-notes']) {
      expect((await request(app).post(`/api/tickets/${ticketId}/${suffix}`).set(headers[2]).send({ content: 'No append' })).body.error.code).toBe('TICKET_READ_ONLY');
      expect((await request(app).get(`/api/tickets/${ticketId}/${suffix}`).set(headers[2])).status).toBe(200);
    }
  });
  it('returns safe errors on database failure', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('private SQL detail'));
    try {
      const response = await queue(''); expect(response.status).toBe(500); expect(response.body.error.correlationId).toBeTruthy(); expect(response.text).not.toContain('private SQL');
      expect(JSON.stringify(log.mock.calls)).not.toContain('private SQL');
    } finally { broken.mockRestore(); log.mockRestore(); }
  });
});
