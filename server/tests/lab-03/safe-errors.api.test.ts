import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { fixtureCredential, sessionHeaders } from '../session-fixture.js';

const ids = [randomUUID(), randomUUID()];
const prefix = `SAFE-${randomUUID()}`;
let staff: Awaited<ReturnType<typeof sessionHeaders>>, admin: typeof staff;
let ticketId: string, categoryId: number, relatedSystemId: number;
const privateDetail = 'private SQL detail and credential material';
// Prisma exposes $transaction through a proxy; retain its bound implementation
// before Vitest replaces/restores the proxy property during failure injection.
const realTransaction = prisma.$transaction.bind(prisma);
beforeAll(async () => {
  for (const [index, role] of (['IT_STAFF', 'ADMINISTRATOR'] as const).entries())
    await prisma.user.create({ data: { id: ids[index], role, email: `${ids[index]}@example.test`, name: prefix, ...fixtureCredential } });
  staff = await sessionHeaders(ids[0]); admin = await sessionHeaders(ids[1]);
  categoryId = (await prisma.category.create({ data: { name: prefix } })).id;
  relatedSystemId = (await prisma.relatedSystem.create({ data: { name: prefix } })).id;
  ticketId = (await prisma.ticket.create({ data: { requesterId: ids[0], categoryId, relatedSystemId, ticketNumber: prefix, summary: prefix, description: 'Synthetic rollback fixture', requestedPriority: 'LOW', itPriority: 'LOW' } })).id;
});
afterEach(() => { vi.restoreAllMocks(); prisma.$transaction = realTransaction; });
afterAll(async () => {
  await prisma.publicComment.deleteMany({ where: { ticketId } });
  await prisma.ticket.deleteMany({ where: { id: ticketId } });
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  if (relatedSystemId) await prisma.relatedSystem.delete({ where: { id: relatedSystemId } });
});
function safe(response: request.Response) {
  expect(response.status).toBe(500);
  expect(response.body.error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  expect(response.text).not.toContain(privateDetail);
}
describe('API-15 safe integrated failures and real transaction rollback', () => {
  it('redacts login failure from response and server log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const agent = request.agent(app);
    const boot = await agent.get('/api/auth/csrf');
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(new Error(privateDetail));
    safe(await agent.post('/api/auth/login').set('Origin', 'http://localhost:3000').set('X-CSRF-Token', boot.body.csrfToken).send({ email: `${ids[0]}@example.test`, password: 'Synthetic invalid credential' }));
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateDetail);
  });
  it('redacts administrator list failure from response and server log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(prisma.user, 'findMany').mockRejectedValueOnce(new Error(privateDetail));
    safe(await request(app).get('/api/admin/users').set(admin));
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateDetail);
  });
  it.each(['queue', 'detail', 'conversation'])('returns a safe correlated %s failure', async kind => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    if (kind === 'detail') vi.spyOn(prisma.ticket, 'findFirst').mockRejectedValueOnce(new Error(privateDetail));
    else vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error(privateDetail));
    const url = kind === 'queue' ? '/api/staff/tickets' : kind === 'detail' ? `/api/staff/tickets/${ticketId}` : `/api/tickets/${ticketId}/comments`;
    safe(await request(app).get(url).set(staff));
  });
  it('rolls back a comment appended before an unexpected transaction failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    const spy = vi.spyOn(prisma, '$transaction');
    spy.mockImplementationOnce(((callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => realTransaction(async tx => {
      await callback(tx);
      throw new Error(privateDetail);
    })) as typeof prisma.$transaction);
    safe(await request(app).post(`/api/tickets/${ticketId}/comments`).set(staff).send({ content: 'This must roll back.' }));
    spy.mockRestore();
    expect(await prisma.publicComment.count({ where: { ticketId } })).toBe(0);
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).toEqual(before);
  });
});
