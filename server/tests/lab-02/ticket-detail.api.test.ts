import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { seedDatabase } from '../../prisma/seed-data.js';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

const requesterAId = '66666666-6666-4666-8666-666666666661';
const requesterBId = '66666666-6666-4666-8666-666666666662';
let ticketId: string;

beforeAll(async () => {
  await seedDatabase(prisma);
  await prisma.attachment.deleteMany({ where: { uploadedByRequesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.ticketCreateRequest.deleteMany({ where: { requesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.requesterUser.deleteMany({ where: { id: { in: [requesterAId, requesterBId] } } });
  await prisma.requesterUser.createMany({ data: [
    { id: requesterAId, name: 'Detail Requester A', email: 'detail.a@example.test', isActive: true },
    { id: requesterBId, name: 'Detail Requester B', email: 'detail.b@example.test', isActive: true },
  ] });
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await prisma.ticket.create({ data: { ticketNumber: 'TKT-20260901-16000001', requesterId: requesterAId, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: 'Owned detail Ticket', description: 'An owned detail description for Issue 16.', requestedPriority: 'MEDIUM' } });
  ticketId = ticket.id;
});

afterAll(async () => {
  await prisma.attachment.deleteMany({ where: { uploadedByRequesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.ticketCreateRequest.deleteMany({ where: { requesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.requesterUser.deleteMany({ where: { id: { in: [requesterAId, requesterBId] } } });
  await prisma.$disconnect();
});

describe('GET /api/tickets/:ticketId', () => {
  it('returns one owned, read-only detail shape without private storage fields', async () => {
    const response = await request(app).get(`/api/tickets/${ticketId}`).set('X-Requester-Id', requesterAId);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      id: ticketId, ticketNumber: 'TKT-20260901-16000001', summary: 'Owned detail Ticket',
      requester: { id: requesterAId, name: 'Detail Requester A', email: 'detail.a@example.test' },
      attachments: [],
    }));
    expect(response.text).not.toMatch(/storageKey|storedName|tmp[\\/]/i);
  });

  it('returns the identical safe 404 for a missing or another Requester ticket', async () => {
    const headers = { 'X-Requester-Id': requesterBId };
    const [nonOwned, missing] = await Promise.all([
      request(app).get(`/api/tickets/${ticketId}`).set(headers),
      request(app).get('/api/tickets/66666666-6666-4666-8666-666666666699').set(headers),
    ]);
    expect(nonOwned.status).toBe(404);
    expect(nonOwned.body).toEqual(missing.body);
    expect(nonOwned.body).toEqual({ error: { code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.' } });
  });
});
