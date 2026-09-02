import { promises as fs } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { seedDatabase } from '../../prisma/seed-data.js';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';
import { attachmentFilePath, attachmentFinalDirectory, attachmentTempDirectory, ensureAttachmentDirectories, safeUnlink } from '../../src/attachment-service.js';

const requesterAId = '55555555-5555-4555-8555-555555555551';
const requesterBId = '55555555-5555-4555-8555-555555555552';
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
let ticketId: string;
let concurrentTicketId: string;
let attachmentId: string;
let transactionSpy: ReturnType<typeof vi.spyOn>;
const directoryFiles = async (directory: string) => (await fs.readdir(directory)).sort();

beforeAll(async () => {
  await ensureAttachmentDirectories();
  const transactionClient = prisma as unknown as { $transaction: (operation: unknown) => Promise<unknown> };
  const originalTransaction = transactionClient.$transaction.bind(prisma);
  transactionSpy = vi.spyOn(transactionClient, '$transaction').mockImplementation(originalTransaction);
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
  const concurrentTicket = await prisma.ticket.create({ data: { ticketNumber: 'TKT-20260901-16000003', requesterId: requesterAId, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: 'Concurrent Attachment Ticket', description: 'Ticket used to verify concurrent Attachment admission.', requestedPriority: 'LOW' } });
  concurrentTicketId = concurrentTicket.id;
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

  it('checks ownership before parsing an uploaded file and uses documented upload error codes', async () => {
    const tempBefore = await directoryFiles(attachmentTempDirectory);
    const finalBefore = await directoryFiles(attachmentFinalDirectory);
    const invalidId = await request(app).post('/api/tickets/not-a-uuid/attachments').set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'bad-id.png', contentType: 'image/png' });
    expect(invalidId.status).toBe(400);
    expect(invalidId.body.error.code).toBe('INVALID_TICKET_ID');
    const nonOwned = await request(app).post(`/api/tickets/${ticketId}/attachments`).set('X-Requester-Id', requesterBId).attach('file', Buffer.from('not png'), { filename: 'bad.png', contentType: 'image/png' });
    expect(nonOwned.status).toBe(404);
    expect(nonOwned.body.error.code).toBe('RESOURCE_NOT_FOUND');
    const missing = await request(app).post(`/api/tickets/${ticketId}/attachments`).set('X-Requester-Id', requesterAId);
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('FILE_REQUIRED');
    const unsupported = await request(app).post(`/api/tickets/${ticketId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', Buffer.from('bad'), { filename: 'bad.png', contentType: 'image/png' });
    expect(unsupported.status).toBe(415);
    expect(unsupported.body.error.code).toBe('ATTACHMENT_TYPE_UNSUPPORTED');
    expect(await directoryFiles(attachmentTempDirectory)).toEqual(tempBefore);
    expect(await directoryFiles(attachmentFinalDirectory)).toEqual(finalBefore);
  });

  it('covers filename, extension, MIME, signature, and exact HTTP size boundaries without rejected-file residue', async () => {
    const template = await prisma.ticket.findFirstOrThrow({ where: { id: ticketId } });
    const edgeTicket = await prisma.ticket.create({ data: { ticketNumber: 'TKT-20260901-16000004', requesterId: requesterAId, categoryId: template.categoryId, relatedSystemId: template.relatedSystemId, summary: 'Attachment edge case Ticket', description: 'Ticket used to verify edge cases in the Attachment API.', requestedPriority: 'LOW' } });
    const edgeId = edgeTicket.id;
    const tempBefore = await directoryFiles(attachmentTempDirectory);
    const finalBefore = await directoryFiles(attachmentFinalDirectory);
    const invalidName = await request(app).post(`/api/tickets/${edgeId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: '.png', contentType: 'image/png' });
    expect(invalidName.status).toBe(400);
    expect(invalidName.body.error.code).toBe('ATTACHMENT_FILENAME_INVALID');
    const invalidExtension = await request(app).post(`/api/tickets/${edgeId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'malware.exe', contentType: 'image/png' });
    expect(invalidExtension.status).toBe(415);
    expect(invalidExtension.body.error.code).toBe('ATTACHMENT_TYPE_UNSUPPORTED');
    const mismatchedMime = await request(app).post(`/api/tickets/${edgeId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'mismatch.png', contentType: 'application/pdf' });
    expect(mismatchedMime.status).toBe(415);
    expect(mismatchedMime.body.error.code).toBe('ATTACHMENT_TYPE_UNSUPPORTED');
    const malformedSignature = await request(app).post(`/api/tickets/${edgeId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', Buffer.from('not a PNG'), { filename: 'malformed.png', contentType: 'image/png' });
    expect(malformedSignature.status).toBe(415);
    expect(malformedSignature.body.error.code).toBe('ATTACHMENT_TYPE_UNSUPPORTED');
    const large = Buffer.alloc(5 * 1024 * 1024 + 1, 0); png.copy(large);
    const oversized = await request(app).post(`/api/tickets/${edgeId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', large, { filename: 'large.png', contentType: 'image/png' });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe('ATTACHMENT_TOO_LARGE');
    expect(await prisma.attachment.count({ where: { ticketId: edgeId } })).toBe(0);
    expect(await directoryFiles(attachmentTempDirectory)).toEqual(tempBefore);
    expect(await directoryFiles(attachmentFinalDirectory)).toEqual(finalBefore);

    const exactLimit = Buffer.alloc(5 * 1024 * 1024, 0); png.copy(exactLimit);
    const acceptedBoundary = await request(app).post(`/api/tickets/${edgeId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', exactLimit, { filename: 'exact-limit.png', contentType: 'image/png' });
    expect(acceptedBoundary.status).toBe(201);
    expect(acceptedBoundary.body.data.sizeBytes).toBe(5 * 1024 * 1024);
  });

  it('covers removal validation/conflict, cross-requester byte/remove access, and no preview route', async () => {
    const template = await prisma.ticket.findFirstOrThrow({ where: { id: ticketId } });
    const edgeTicket = await prisma.ticket.create({ data: { ticketNumber: 'TKT-20260901-16000005', requesterId: requesterAId, categoryId: template.categoryId, relatedSystemId: template.relatedSystemId, summary: 'Attachment removal edge Ticket', description: 'Ticket used to verify removal edge cases.', requestedPriority: 'LOW' } });
    const edgeId = edgeTicket.id;
    const active = await request(app).post(`/api/tickets/${edgeId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'remove-me.png', contentType: 'image/png' });
    expect(active.status).toBe(201);
    const id = active.body.data.id;
    expect((await request(app).delete(`/api/attachments/${id}`).set('X-Requester-Id', requesterAId).send({ reason: 'bad' })).status).toBe(400);
    expect((await request(app).get(`/api/attachments/${id}/download`).set('X-Requester-Id', requesterBId)).status).toBe(404);
    expect((await request(app).delete(`/api/attachments/${id}`).set('X-Requester-Id', requesterBId).send({ reason: 'A valid removal reason.' })).status).toBe(404);
    expect((await request(app).delete(`/api/attachments/${id}`).set('X-Requester-Id', requesterAId).send({ reason: 'A valid removal reason.' })).status).toBe(200);
    expect((await request(app).delete(`/api/attachments/${id}`).set('X-Requester-Id', requesterAId).send({ reason: 'A valid removal reason.' })).status).toBe(409);
    expect((await request(app).get(`/api/attachments/${id}/preview`).set('X-Requester-Id', requesterAId)).status).toBe(404);
  });

  it('compensates storage and metadata failures without deleting the Ticket or successful uploads', async () => {
    const tempBefore = await directoryFiles(attachmentTempDirectory);
    const finalBefore = await directoryFiles(attachmentFinalDirectory);
    const attachmentCountBefore = await prisma.attachment.count({ where: { ticketId } });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const rename = vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('Injected private storage path'));
    const storageFailure = await request(app).post(`/api/tickets/${ticketId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'storage-failure.png', contentType: 'image/png' });
    rename.mockRestore();
    expect(storageFailure.status).toBe(500);
    expect(storageFailure.body.error).toEqual(expect.objectContaining({ code: 'ATTACHMENT_UPLOAD_FAILED', message: 'The Attachment could not be uploaded. Try again.', correlationId: expect.any(String) }));
    expect(storageFailure.text).not.toMatch(/storage path|Injected/i);
    expect(await directoryFiles(attachmentTempDirectory)).toEqual(tempBefore);
    expect(await directoryFiles(attachmentFinalDirectory)).toEqual(finalBefore);
    expect(await prisma.attachment.count({ where: { ticketId } })).toBe(attachmentCountBefore);

    transactionSpy.mockImplementationOnce(async (operation: unknown) => {
      const callback = operation as (client: unknown) => Promise<unknown>;
      return callback({
        $queryRaw: async () => [{ id: ticketId }],
        attachment: {
          count: async () => attachmentCountBefore,
          create: async () => { throw new Error('Injected private database detail'); },
        },
      });
    });
    const metadataFailure = await request(app).post(`/api/tickets/${ticketId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'metadata-failure.png', contentType: 'image/png' });
    log.mockRestore();
    expect(metadataFailure.status).toBe(500);
    expect(metadataFailure.body.error.code).toBe('ATTACHMENT_UPLOAD_FAILED');
    expect(metadataFailure.text).not.toMatch(/database detail|storage|tmp[\\/]/i);
    expect(await directoryFiles(attachmentTempDirectory)).toEqual(tempBefore);
    expect(await directoryFiles(attachmentFinalDirectory)).toEqual(finalBefore);
    expect(await prisma.attachment.count({ where: { ticketId } })).toBe(attachmentCountBefore);
    expect(await prisma.ticket.findUnique({ where: { id: ticketId } })).not.toBeNull();
  });

  it('returns a safe removal failure and leaves removal metadata unchanged', async () => {
    const template = await prisma.ticket.findFirstOrThrow({ where: { id: ticketId } });
    const removalTicket = await prisma.ticket.create({ data: { ticketNumber: 'TKT-20260901-16000006', requesterId: requesterAId, categoryId: template.categoryId, relatedSystemId: template.relatedSystemId, summary: 'Injected removal failure Ticket', description: 'Ticket used to isolate an injected removal failure.', requestedPriority: 'LOW' } });
    const active = await prisma.attachment.create({ data: { ticketId: removalTicket.id, originalName: 'removal-failure.png', storedName: 'removal-failure.png', storageKey: 'removal-failure.png', mimeType: 'image/png', sizeBytes: png.length, uploadedByRequesterId: requesterAId } });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    transactionSpy.mockRejectedValueOnce(new Error('Injected private removal SQL'));
    const response = await request(app).delete(`/api/attachments/${active.id}`).set('X-Requester-Id', requesterAId).send({ reason: 'A valid removal reason.' });
    log.mockRestore();
    expect(response.status).toBe(500);
    expect(response.body.error).toEqual(expect.objectContaining({ code: 'ATTACHMENT_REMOVE_FAILED', message: 'The Attachment could not be removed. Try again.', correlationId: expect.any(String) }));
    expect(response.text).not.toMatch(/removal SQL|Injected/i);
    expect(await prisma.attachment.findUniqueOrThrow({ where: { id: active.id } })).toEqual(expect.objectContaining({ removedAt: null, removalReason: null, removedByRequesterId: null }));
  });

  it('enforces the five-active limit, permits a replacement, and serializes concurrent admission', async () => {
    await prisma.attachment.createMany({ data: Array.from({ length: 5 }, (_, index) => ({ ticketId, originalName: `limit-${index}.png`, storedName: `limit-${index}.png`, storageKey: `limit-${index}.png`, mimeType: 'image/png', sizeBytes: png.length, uploadedByRequesterId: requesterAId })) });
    const sixth = await request(app).post(`/api/tickets/${ticketId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'sixth.png', contentType: 'image/png' });
    expect(sixth.status).toBe(409);
    expect(sixth.body.error.code).toBe('ATTACHMENT_LIMIT_REACHED');
    const first = await prisma.attachment.findFirstOrThrow({ where: { ticketId, removedAt: null } });
    await prisma.attachment.update({ where: { id: first.id }, data: { removedAt: new Date(), removalReason: 'Free an active attachment slot.', removedByRequesterId: requesterAId } });
    const replacement = await request(app).post(`/api/tickets/${ticketId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'replacement.png', contentType: 'image/png' });
    expect(replacement.status).toBe(201);

    await prisma.attachment.createMany({ data: Array.from({ length: 4 }, (_, index) => ({ ticketId: concurrentTicketId, originalName: `parallel-${index}.png`, storedName: `parallel-${index}.png`, storageKey: `parallel-${index}.png`, mimeType: 'image/png', sizeBytes: png.length, uploadedByRequesterId: requesterAId })) });
    const [left, right] = await Promise.all([
      request(app).post(`/api/tickets/${concurrentTicketId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'parallel-left.png', contentType: 'image/png' }),
      request(app).post(`/api/tickets/${concurrentTicketId}/attachments`).set('X-Requester-Id', requesterAId).attach('file', png, { filename: 'parallel-right.png', contentType: 'image/png' }),
    ]);
    expect([left.status, right.status].sort()).toEqual([201, 409]);
    expect(await prisma.attachment.count({ where: { ticketId: concurrentTicketId, removedAt: null } })).toBe(5);
  });

  it('returns a safe unavailable-file error without leaking private storage information', async () => {
    const unavailable = await prisma.attachment.create({ data: { ticketId, originalName: 'missing.pdf', storedName: 'private.pdf', storageKey: 'does-not-exist.pdf', mimeType: 'application/pdf', sizeBytes: 5, uploadedByRequesterId: requesterAId } });
    const response = await request(app).get(`/api/attachments/${unavailable.id}/download`).set('X-Requester-Id', requesterAId);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'ATTACHMENT_FILE_UNAVAILABLE', message: 'This file cannot be downloaded right now.' } });
    expect(response.text).not.toContain('does-not-exist');
  });
});
