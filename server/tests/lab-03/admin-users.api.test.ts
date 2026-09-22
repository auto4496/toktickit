import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { fixtureCredential, sessionHeaders } from '../session-fixture.js';
import { hashPassword, verifyPassword } from '../../src/auth/password.js';
import { Role } from '@prisma/client';

const ids: string[] = [], ticketIds: string[] = [];
const prefix = `ADMIN-${randomUUID()}`;
const initialPassword = 'Synthetic initial password for admin tests 2026';
let admin: Awaited<ReturnType<typeof makeUser>>, staff: Awaited<ReturnType<typeof makeUser>>, requester: Awaited<ReturnType<typeof makeUser>>;
let categoryId: number, relatedSystemId: number;
async function makeUser(role: Role = 'REQUESTER', extra = {}) {
  const id = randomUUID(); ids.push(id);
  const user = await prisma.user.create({ data: { id, name: `${prefix} ${ids.length}`, email: `${id}@example.test`, role, ...fixtureCredential, ...extra } });
  return { user, headers: await sessionHeaders(id) };
}
const edit = (user: { id: string; name: string; email: string; role: Role; isActive: boolean; version: number }, changes = {}, headers = admin.headers) => request(app).patch(`/api/admin/users/${user.id}`).set(headers).send({ name: user.name, email: user.email, role: user.role, isActive: user.isActive, expectedVersion: user.version, ...changes });
async function ticket(ownerId: string | null, currentStatus: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' = 'NEW') {
  const row = await prisma.ticket.create({ data: { ticketNumber: `${prefix}-${ticketIds.length}`, categoryId, relatedSystemId, requesterId: requester.user.id, ownerId, currentStatus, summary: 'Administrator safety fixture', description: 'Synthetic owner safety fixture only.', requestedPriority: 'LOW', itPriority: 'LOW' } }); ticketIds.push(row.id); return row;
}
beforeAll(async () => {
  admin = await makeUser('ADMINISTRATOR'); staff = await makeUser('IT_STAFF'); requester = await makeUser();
  categoryId = (await prisma.category.create({ data: { name: prefix } })).id;
  relatedSystemId = (await prisma.relatedSystem.create({ data: { name: prefix } })).id;
});
afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  if (relatedSystemId) await prisma.relatedSystem.delete({ where: { id: relatedSystemId } });
});
describe('API-12–14 administrator accounts', () => {
  it('enforces authorization before target/body validation and requires CSRF', async () => {
    expect((await request(app).get('/api/admin/users')).status).toBe(401);
    for (const actor of [staff, requester]) {
      expect((await request(app).get('/api/admin/users?invalid=true').set(actor.headers)).status).toBe(403);
      expect((await request(app).patch('/api/admin/users/invalid').set(actor.headers).send({})).status).toBe(403);
      expect((await request(app).post('/api/admin/users/invalid/initial-password').set(actor.headers).send({})).status).toBe(403);
    }
    expect((await request(app).post('/api/admin/users').set('Cookie', admin.headers.Cookie).send({})).status).toBe(403);
    const restricted = await makeUser('ADMINISTRATOR', { mustChangePassword: true });
    expect((await request(app).get('/api/admin/users').set(restricted.headers)).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
  it('returns only safe fields, filters literal names/emails and orders deterministically', async () => {
    const special = await makeUser('REQUESTER', { name: `${prefix} 50%_done` });
    const response = await request(app).get(`/api/admin/users?search=${encodeURIComponent(prefix)}&role=REQUESTER`).set(admin.headers);
    expect(response.status).toBe(200); expect(response.body.data.every((u: { role: string }) => u.role === 'REQUESTER')).toBe(true);
    expect(Object.keys(response.body.data[0]).sort()).toEqual(['id', 'name', 'email', 'role', 'isActive', 'mustChangePassword', 'version', 'createdAt', 'updatedAt'].sort());
    const result = await request(app).get('/api/admin/users?search=50%25_done').set(admin.headers); expect(result.body.data.map((u: { id: string }) => u.id)).toEqual([special.user.id]);
    expect(response.text).not.toMatch(/passwordHash|tokenHash|csrfToken|initialPassword/);
  });
  it.each(['unknown=x', 'search=x&search=y', 'role=BAD', 'role=REQUESTER&role=IT_STAFF', `search=${'a'.repeat(101)}`])('rejects invalid list query %s', async query => { expect((await request(app).get(`/api/admin/users?${query}`).set(admin.headers)).status).toBe(400); });
  it('normalizes new users, stores a real hash and handles simultaneous duplicate emails', async () => {
    const email = `${randomUUID()}@example.test`;
    const body = { name: '  Cafe\u0301  ', email: ` ${email.toUpperCase()} `, role: 'IT_STAFF', isActive: true, initialPassword };
    const results = await Promise.all([0, 1].map(() => request(app).post('/api/admin/users').set(admin.headers).send(body)));
    expect(results.map(r => r.status).sort()).toEqual([201, 409]); const created = results.find(r => r.status === 201)!.body.data; ids.push(created.id);
    expect(created).toMatchObject({ name: 'Café', email, role: 'IT_STAFF', mustChangePassword: true, version: 1 }); expect(results.find(r => r.status === 409)!.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: created.id } }); expect(await verifyPassword(initialPassword, stored.passwordHash)).toBe(true); expect(JSON.stringify(created)).not.toContain(initialPassword);
  }, 20_000);
  it.each([{ isActive: 'true' }, { role: ['IT_STAFF'] }, { name: ' ' }, { email: 'bad' }, { initialPassword: 'short' }, { extra: true }])('rejects invalid create form %j', async changes => {
    expect((await request(app).post('/api/admin/users').set(admin.headers).send({ name: 'Valid user', email: `${randomUUID()}@example.test`, role: 'REQUESTER', isActive: true, initialPassword, ...changes })).status).toBe(400);
  });
  it('preserves sessions on name/email edits, revokes them on role/activity changes and refuses stale writes', async () => {
    const member = await makeUser(); const result = await edit(member.user, { name: 'Renamed user' }); expect(result.status).toBe(200); expect(result.body.data.version).toBe(2);
    expect((await request(app).get('/api/auth/me').set(member.headers)).body.user.name).toBe('Renamed user');
    expect((await edit(member.user, { name: 'Stale overwrite' })).body.error.code).toBe('USER_CONFLICT');
    const role = await edit(result.body.data, { role: 'IT_STAFF' }); expect(role.status).toBe(200); expect((await request(app).get('/api/auth/me').set(member.headers)).status).toBe(401);
    const newHeaders = await sessionHeaders(member.user.id); expect((await edit(role.body.data, { isActive: false })).status).toBe(200); expect((await request(app).get('/api/auth/me').set(newHeaders)).status).toBe(401);
  });
  it('accepts only one of simultaneous updates to the same version', async () => {
    const member = await makeUser(); const result = await Promise.all([edit(member.user, { name: 'First' }), edit(member.user, { name: 'Second' })]); expect(result.map(r => r.status).sort()).toEqual([200, 409]); expect(result.find(r => r.status === 409)!.body.error.code).toBe('USER_CONFLICT');
  });
  it('prevents self-deactivation and simultaneous loss of the last active admin', async () => {
    expect((await edit(admin.user, { isActive: false })).body.error.code).toBe('SELF_DEACTIVATION_FORBIDDEN');
    // Isolate the global invariant inside this dedicated test database, restoring
    // existing administrators in finally even when an assertion fails.
    const existing = await prisma.user.findMany({ where: { role: 'ADMINISTRATOR', isActive: true, id: { not: admin.user.id } } });
    const other = await makeUser('ADMINISTRATOR');
    try {
      await prisma.user.updateMany({ where: { id: { in: existing.map(u => u.id) } }, data: { isActive: false } });
      const results = await Promise.all([edit(admin.user, { role: 'REQUESTER' }, admin.headers), edit(other.user, { role: 'REQUESTER' }, other.headers)]);
      expect(results.map(r => r.status).sort()).toEqual([200, 409]); expect(results.find(r => r.status === 409)!.body.error.code).toBe('LAST_ACTIVE_ADMIN_REQUIRED');
      expect(await prisma.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } })).toBe(1);
    } finally {
      await prisma.user.updateMany({ where: { id: { in: existing.map(u => u.id) } }, data: { isActive: true } });
      await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'ADMINISTRATOR' } });
      admin.user = await prisma.user.findUniqueOrThrow({ where: { id: admin.user.id } }); admin.headers = await sessionHeaders(admin.user.id);
    }
  });
  it.each(['IN_PROGRESS', 'RESOLVED'] as const)('blocks loss of an assigned owner in %s and preserves terminal history', async status => {
    const owner = await makeUser('IT_STAFF'); const row = await ticket(owner.user.id, status);
    expect((await edit(owner.user, { isActive: false })).body.error.code).toBe('USER_HAS_ACTIVE_TICKETS'); expect((await edit(owner.user, { role: 'REQUESTER' })).body.error.code).toBe('USER_HAS_ACTIVE_TICKETS');
    await prisma.ticket.update({ where: { id: row.id }, data: { currentStatus: 'CLOSED' } }); expect((await edit(owner.user, { isActive: false })).status).toBe(200); expect((await prisma.ticket.findUniqueOrThrow({ where: { id: row.id } })).ownerId).toBe(owner.user.id);
  });
  it('serializes real claim and account deactivation endpoints', async () => {
    const owner = await makeUser('IT_STAFF'); const row = await ticket(null);
    const results = await Promise.all([request(app).post(`/api/staff/tickets/${row.id}/claim`).set(owner.headers).send({ expectedVersion: 1 }), edit(owner.user, { isActive: false })]);
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    const current = await prisma.ticket.findUniqueOrThrow({ where: { id: row.id } }), user = await prisma.user.findUniqueOrThrow({ where: { id: owner.user.id } }); expect(current.ownerId === owner.user.id && !user.isActive).toBe(false);
    if (results[0].status === 200) expect(results[1].body.error.code).toBe('USER_HAS_ACTIVE_TICKETS'); else expect(results[0].status).toBe(401);
  });
  it('serializes assignment with account demotion through the real endpoints', async () => {
    const owner = await makeUser('IT_STAFF'); const row = await ticket(null);
    const results = await Promise.all([request(app).patch(`/api/staff/tickets/${row.id}/owner`).set(staff.headers).send({ ownerId: owner.user.id, expectedVersion: 1, confirmed: true }), edit(owner.user, { role: 'REQUESTER' })]);
    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    const current = await prisma.ticket.findUniqueOrThrow({ where: { id: row.id } }), user = await prisma.user.findUniqueOrThrow({ where: { id: owner.user.id } }); expect(current.ownerId === owner.user.id && user.role === 'REQUESTER').toBe(false);
    expect(results[0].status === 200 ? results[1].body.error.code : results[0].body.error.code).toBe(results[0].status === 200 ? 'USER_HAS_ACTIVE_TICKETS' : 'OWNER_NOT_ELIGIBLE');
  });
  it.each(['IN_PROGRESS', 'RESOLVED'] as const)('keeps a valid owner when %s races deactivation', async status => {
    const owner = await makeUser('IT_STAFF'); const row = await ticket(owner.user.id, 'IN_PROGRESS');
    if (status === 'IN_PROGRESS') await prisma.ticket.update({ where: { id: row.id }, data: { currentStatus: 'OPEN' } });
    const results = await Promise.all([request(app).patch(`/api/staff/tickets/${row.id}/status`).set(staff.headers).send({ currentStatus: status, expectedVersion: 1, confirmed: true }), edit(owner.user, { isActive: false })]);
    expect(results[0].status).toBe(200); expect(results[1].body.error.code).toBe('USER_HAS_ACTIVE_TICKETS'); expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.user.id } })).isActive).toBe(true);
  });
  it('resets a password, invalidates every session, requires a different password and enforces the initial gate', async () => {
    const member = await makeUser('REQUESTER', { passwordHash: await hashPassword(initialPassword) }); const second = await sessionHeaders(member.user.id);
    const reset = (password: string, expectedVersion = 1) => request(app).post(`/api/admin/users/${member.user.id}/initial-password`).set(admin.headers).send({ initialPassword: password, confirmPassword: password, expectedVersion });
    expect((await reset(initialPassword)).status).toBe(400);
    const next = 'Replacement synthetic password for admin tests 2026'; const result = await reset(next); expect(result.status).toBe(200); expect(result.body.data).toMatchObject({ version: 2, mustChangePassword: true });
    for (const headers of [member.headers, second]) expect((await request(app).get('/api/auth/me').set(headers)).status).toBe(401);
    const current = await prisma.user.findUniqueOrThrow({ where: { id: member.user.id } }); expect(await verifyPassword(next, current.passwordHash)).toBe(true); expect(await verifyPassword(initialPassword, current.passwordHash)).toBe(false);
    expect((await request(app).get('/api/tickets').set(await sessionHeaders(member.user.id))).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED'); expect((await reset('Another valid initial password 2026')).body.error.code).toBe('USER_CONFLICT');
  }, 20_000);
  it('clears its own cookie on reset, denies unsupported deletion and reports missing targets', async () => {
    const self = await makeUser('ADMINISTRATOR');
    expect((await request(app).delete(`/api/admin/users/${self.user.id}`).set(admin.headers)).status).toBe(404);
    expect((await edit({ ...self.user, id: randomUUID() })).status).toBe(404);
    const result = await request(app).post(`/api/admin/users/${self.user.id}/initial-password`).set(self.headers).send({ initialPassword, confirmPassword: initialPassword, expectedVersion: 1 }); expect(result.status).toBe(200); expect(result.headers['set-cookie'].join(';')).toMatch(/toktickit.sid=;/); expect((await request(app).get('/api/auth/me').set(self.headers)).status).toBe(401);
  }, 15_000);
});
