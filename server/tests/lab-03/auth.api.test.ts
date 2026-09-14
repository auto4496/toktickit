import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { hashPassword } from '../../src/auth/password.js';

const origin = 'http://localhost:3000';
const password = 'A quiet green garden 2026';
const nextPassword = 'A different quiet garden 2026';
const ids: string[] = [];
let active: { id: string; email: string };
let inactive: { id: string; email: string };
async function login(email: string, pass = password) {
  const agent = request.agent(app);
  const boot = await agent.get('/api/auth/csrf');
  const response = await agent.post('/api/auth/login').set('Origin', origin)
    .set('X-CSRF-Token', boot.body.csrfToken).send({ email, password: pass });
  return { agent, response, csrf: response.body.csrfToken as string };
}
beforeAll(async () => {
  const passwordHash = await hashPassword(password);
  for (const isActive of [true, false]) {
    const id = randomUUID(); ids.push(id);
    const user = await prisma.user.create({ data: { id, email: `${id}@example.test`, name: 'Auth fixture', isActive, passwordHash } });
    if (isActive) active = user; else inactive = user;
  }
}, 15_000);
afterAll(async () => {
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});
describe('Authentication API (API-01..04)', () => {
  it('returns safe JSON validation errors for malformed and oversized auth bodies', async () => {
    const malformed = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{');
    expect(malformed.status).toBe(400); expect(malformed.body.error.code).toBe('INVALID_JSON');
    const large = await request(app).post('/api/auth/login').send({ password: 'x'.repeat(33_000) });
    expect(large.status).toBe(413); expect(large.body.error.code).toBe('REQUEST_TOO_LARGE');
  });
  it('rejects login without the pre-auth CSRF exchange', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', origin).send({ email: active.email, password });
    expect(res.status).toBe(403);
  });
  it('gates initial-password sessions, changes password, rotates session and logs out', async () => {
    const { agent, response, csrf } = await login(active.email.toUpperCase());
    expect(response.status).toBe(200);
    expect(response.body.user.mustChangePassword).toBe(true);
    expect(response.text).not.toMatch(/passwordHash|tokenHash/);
    expect(response.headers['set-cookie'].join(';')).toContain('HttpOnly');
    const oldCookie = response.headers['set-cookie'].find((v: string) => v.startsWith('toktickit.sid='))!.split(';')[0];
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    expect((await agent.get('/api/tickets')).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    const wrongOrigin = await agent.post('/api/auth/change-password').set('Origin', 'https://evil.example').set('X-CSRF-Token', csrf).send({});
    expect(wrongOrigin.status).toBe(403);
    const changed = await agent.post('/api/auth/change-password').set('Origin', origin).set('X-CSRF-Token', csrf)
      .send({ currentPassword: password, newPassword: nextPassword, confirmPassword: nextPassword });
    expect(changed.status).toBe(200);
    expect(changed.body.user.mustChangePassword).toBe(false);
    expect((await request(app).get('/api/auth/me').set('Cookie', oldCookie)).status).toBe(401);
    expect((await agent.get('/api/tickets')).status).toBe(200);
    const loggedOut = await agent.post('/api/auth/logout').set('Origin', origin).set('X-CSRF-Token', changed.body.csrfToken).send({});
    expect(loggedOut.status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  }, 15_000);
  it('does not disclose unknown, inactive or wrong-password accounts', async () => {
    const results = await Promise.all([login(inactive.email), login('unknown@example.test'), login(active.email, 'An incorrect long password')]);
    for (const { response } of results) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual(results[0].response.body);
    }
  }, 15_000);
  it('rejects forged requester identity without a session and removes the directory', async () => {
    expect((await request(app).get('/api/tickets').set('X-Requester-Id', active.id)).status).toBe(401);
    expect((await request(app).get('/api/requesters')).status).toBe(404);
  });
  it('invalidates expired sessions and sessions whose user version or activity changes', async () => {
    const first = await login(active.email, nextPassword);
    await prisma.authSession.updateMany({ where: { userId: active.id }, data: { expiresAt: new Date(0) } });
    expect((await first.agent.get('/api/auth/me')).status).toBe(401);
    const second = await login(active.email, nextPassword);
    await prisma.user.update({ where: { id: active.id }, data: { version: { increment: 1 } } });
    expect((await second.agent.get('/api/auth/me')).status).toBe(401);
    const third = await login(active.email, nextPassword);
    await prisma.user.update({ where: { id: active.id }, data: { isActive: false } });
    expect((await third.agent.get('/api/auth/me')).status).toBe(401);
  }, 15_000);
  it('limits failed login attempts and supplies a retry interval', async () => {
    const email = `${randomUUID()}@example.test`;
    for (let index = 0; index < 5; index++) expect((await login(email)).response.status).toBe(401);
    const limited = (await login(email)).response;
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  }, 15_000);
});
