import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { seedDatabase } from '../../prisma/seed-data.js';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { attachmentFilePath, safeUnlink } from '../../src/attachment-service.js';

const requesterAId = '55555555-5555-4555-8555-555555555551';
const requesterBId = '55555555-5555-4555-8555-555555555552';
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
let ticketId: string;
let attachmentId: string;

beforeAll(async () => {
  await seedDatabase(prisma);
  await prisma.attachment.deleteMany({ where: { uploadedByRequesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.requesterUser.deleteMany({ where: { id: { in: [requesterAId, requesterBId] } } });
  await prisma.requesterUser.createMany({ data: [
    { id: requesterAId, name: 'Attachment Requester A', email: 'attachment.a@example.test', isActive: true },
    { id: requesterBId, name: 'Attachment Requester B', email: 'attachment.b@example.test', isActive: true },
  ] });
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await prisma.ticket.create({ data: { ticketNumber: 'TKT-20260901-16000002', requesterId: requesterAId, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: 'Attachment lifecycle Ticket', description: 'Ticket used to verify Attachment lifecycle.', requestedPriority: 'LOW' } });
  ticketId = ticket.id;
});

afterAll(async () => {
  const attachments = await prisma.attachment.findMany({ where: { uploadedByRequesterId: { in: [requesterAId, requesterBId] } }, select: { storageKey: true } });
  await Promise.all(attachments.map((item) => safeUnlink(attachmentFilePath(item))));
  await prisma.attachment.deleteMany({ where: { uploadedByRequesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: [requesterAId, requesterBId] } } });
  await prisma.requesterUser.deleteMany({ where: { id: { in: [requesterAId, requesterBId] } } });
  await prisma.$disconnect();
});

describe('Attachment lifecycle', () => {
  it('uploads verified bytes, returns safe metadata, downloads, and retains soft-removal metadata', async () => {
    const upload = await request(app).post(`/api/tickets/${ticketId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'vpn-error.PNG', contentType: 'image/png' });
    expect(upload.status).toBe(201);
    expect(upload.body.data).toEqual(expect.objectContaining({ ticketId, originalName: 'vpn-error.PNG', mimeType: 'image/png', sizeBytes: png.length, canDownload: true }));
    expect(upload.text).not.toMatch(/storageKey|storedName|tmp[\\/]/i);
    attachmentId = upload.body.data.id;
    const download = await request(app).get(`/api/attachments/${attachmentId}/download`).set('X-Requester-Id', requesterAId);
    expect(download.status).toBe(200);
    expect(download.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(download.body)).toEqual(png);
    const removed = await request(app).delete(`/api/attachments/${attachmentId}`).set('X-Requester-Id', requesterAId).send({ reason: 'Uploaded the wrong screenshot.' });
    expect(removed.status).toBe(200);
    expect(removed.body.data).toEqual(expect.objectContaining({ canDownload: false, removalReason: 'Uploaded the wrong screenshot.', removedAt: expect.any(String) }));
    const removedDownload = await request(app).get(`/api/attachments/${attachmentId}/download`).set('X-Requester-Id', requesterAId);
    expect(removedDownload.status).toBe(404);
  });

  it('does not disclose Attachment metadata to a different Requester', async () => {
    const response = await request(app).get(`/api/attachments/${attachmentId}`).set('X-Requester-Id', requesterBId);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.' } });
  });
});
