import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { fixtureCredential, sessionHeaders } from '../session-fixture.js';
import { attachmentFilePath, safeUnlink } from '../../src/attachment-service.js';

const users = ['REQUESTER', 'REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'].map(role => ({ id: randomUUID(), role: role as 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' }));
const headers: Awaited<ReturnType<typeof sessionHeaders>>[] = [];
let ticketId: string; let attachmentId: string;
let categoryId: number; let relatedSystemId: number;
beforeAll(async () => {
  categoryId = (await prisma.category.create({ data: { name: `Authz ${randomUUID()}` } })).id;
  relatedSystemId = (await prisma.relatedSystem.create({ data: { name: `Authz ${randomUUID()}` } })).id;
  for (const user of users) {
    await prisma.user.create({ data: { ...user, name: 'Authorization fixture', email: `${user.id}@example.test`, ...fixtureCredential } });
    headers.push(await sessionHeaders(user.id));
  }
  ticketId = (await prisma.ticket.create({ data: { requesterId: users[0].id, ticketNumber: `AUTHZ-${randomUUID()}`, categoryId, relatedSystemId, summary: 'Authorization test ticket', description: 'Authorization test ticket description.', requestedPriority: 'HIGH', itPriority: 'HIGH' } })).id;
  const upload = await request(app).post(`/api/tickets/${ticketId}/attachments`).set(headers[0]).attach('file', Buffer.from('%PDF-1.4\nSynthetic fixture'), { filename: 'fixture.pdf', contentType: 'application/pdf' });
  expect(upload.status).toBe(201); attachmentId = upload.body.data.id;
});
afterAll(async () => {
  if (ticketId) {
    for (const item of await prisma.attachment.findMany({ where: { ticketId } })) await safeUnlink(attachmentFilePath(item));
    await prisma.attachment.deleteMany({ where: { ticketId } });
    await prisma.ticket.deleteMany({ where: { id: ticketId } });
  }
  await prisma.authSession.deleteMany({ where: { userId: { in: users.map(u => u.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
  if (relatedSystemId) await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
});
describe('Foundation role and ownership matrix', () => {
  it.each([0, 1, 2, 3])('checks attachment metadata/download for identity %i', async index => {
    const expected = index === 1 ? 404 : 200;
    for (const suffix of ['', '/download']) {
      const response = await request(app).get(`/api/attachments/${attachmentId}${suffix}`).set(headers[index]);
      expect(response.status).toBe(expected);
      if (!suffix) expect(response.text).not.toMatch(/storageKey|passwordHash|internalNotes/);
    }
  });
  it.each([2, 3])('does not grant requester mutations to staff/admin identity %i', async index => {
    expect((await request(app).get('/api/tickets').set(headers[index])).status).toBe(403);
    expect((await request(app).post('/api/tickets').set(headers[index]).send({})).status).toBe(403);
    expect((await request(app).post(`/api/tickets/${ticketId}/attachments`).set(headers[index])).status).toBe(403);
    expect((await request(app).delete(`/api/attachments/${attachmentId}`).set(headers[index]).send({ reason: 'Cannot remove this file.' })).status).toBe(403);
  });
  it('ignores forged requester identity and does not disclose ownership before validation', async () => {
    const other = await request(app).delete(`/api/attachments/${attachmentId}`).set(headers[1]).set('X-Requester-Id', users[0].id).send({ reason: 'bad' });
    const absent = await request(app).delete(`/api/attachments/${randomUUID()}`).set(headers[1]).send({ reason: 'bad' });
    expect(other.status).toBe(404); expect(other.body).toEqual(absent.body);
  });
  it('rejects forged ticket fields and CSRF without mutating data', async () => {
    const body = { categoryId, relatedSystemId, summary: 'Mass assignment attempt', description: 'A synthetic attempt to set protected fields.', requestedPriority: 'HIGH', requesterId: users[1].id };
    const response = await request(app).post('/api/tickets').set(headers[0]).set('Idempotency-Key', randomUUID()).send(body);
    expect(response.status).toBe(400);
    expect((await request(app).delete(`/api/attachments/${attachmentId}`).set('Cookie', headers[0].Cookie).send({ reason: 'Missing CSRF credentials.' })).status).toBe(403);
    expect((await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } })).removedAt).toBeNull();
  });
});
