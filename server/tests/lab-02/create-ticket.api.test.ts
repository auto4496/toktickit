import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { seedDatabase } from '../../prisma/seed-data.js';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

const requesterId = '66666666-6666-4666-8666-666666666666';
const requesterHeader = { 'X-Requester-Id': requesterId };
const inactiveCategory = 'Issue 14 Inactive Category';
const inactiveRelatedSystem = 'Issue 14 Inactive System';

let categoryId: number;
let relatedSystemId: number;
let inactiveCategoryId: number;
let inactiveRelatedSystemId: number;

const validBody = (summary = 'Issue 14 valid Ticket') => ({
  categoryId,
  relatedSystemId,
  summary,
  requestedPriority: 'MEDIUM',
  description: 'This is a valid Issue 14 Ticket description.',
});

const postTicket = (idempotencyKey: string, body = validBody()) =>
  request(app)
    .post('/api/tickets')
    .set(requesterHeader)
    .set('Idempotency-Key', idempotencyKey)
    .send(body);

beforeAll(async () => {
  await seedDatabase(prisma);
  await prisma.requesterUser.upsert({
    where: { email: 'issue14.api@example.test' },
    update: { id: requesterId, name: 'Issue 14 API Requester', isActive: true },
    create: {
      id: requesterId,
      name: 'Issue 14 API Requester',
      email: 'issue14.api@example.test',
      isActive: true,
    },
  });

  const category = await prisma.category.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });
  categoryId = category.id;
  relatedSystemId = relatedSystem.id;

  inactiveCategoryId = (
    await prisma.category.upsert({
      where: { name: inactiveCategory },
      update: { isActive: false },
      create: { name: inactiveCategory, isActive: false },
    })
  ).id;
  inactiveRelatedSystemId = (
    await prisma.relatedSystem.upsert({
      where: { name: inactiveRelatedSystem },
      update: { isActive: false },
      create: { name: inactiveRelatedSystem, isActive: false },
    })
  ).id;
});

afterAll(async () => {
  await prisma.ticketCreateRequest.deleteMany({ where: { requesterId } });
  await prisma.ticket.deleteMany({ where: { requesterId } });
  await prisma.category.deleteMany({ where: { name: inactiveCategory } });
  await prisma.relatedSystem.deleteMany({ where: { name: inactiveRelatedSystem } });
  await prisma.requesterUser.deleteMany({ where: { id: requesterId } });
});

describe('POST /api/tickets', () => {
  it('creates one owned Ticket with server-controlled values', async () => {
    const response = await postTicket(randomUUID(), {
      ...validBody('  Issue 14 normalized Ticket  '),
      description: '  A normalized description for the valid Ticket.  ',
      ticketNumber: 'CLIENT-CANNOT-CONTROL',
      currentStatus: 'CLOSED',
      itPriority: 'HIGH',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      ticketNumber: expect.stringMatching(/^TKT-\d{8}-[0-9A-F]{8}$/),
      ticketDate: expect.any(String),
      requester: {
        id: requesterId,
        name: 'Issue 14 API Requester',
        email: 'issue14.api@example.test',
      },
      category: { id: categoryId, name: expect.any(String) },
      relatedSystem: { id: relatedSystemId, name: expect.any(String) },
      summary: 'Issue 14 normalized Ticket',
      requestedPriority: 'MEDIUM',
      itPriority: null,
      description: 'A normalized description for the valid Ticket.',
      currentStatus: 'NEW',
      attachments: [],
      updatedAt: expect.any(String),
    });

    const saved = await prisma.ticket.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(saved.requesterId).toBe(requesterId);
    expect(saved.currentStatus).toBe('NEW');
    expect(saved.itPriority).toBeNull();
  });

  it.each([
    ['missing fields', {}],
    ['blank fields', { ...validBody(), summary: ' ', description: '   ' }],
    ['short fields', { ...validBody(), summary: 'four', description: 'too short' }],
    ['invalid priority', { ...validBody(), requestedPriority: 'URGENT' }],
    ['invalid IDs', { ...validBody(), categoryId: 0, relatedSystemId: 1.5 }],
  ])('returns field errors and saves nothing for %s', async (_name, body) => {
    const before = await prisma.ticket.count({ where: { requesterId } });
    const response = await postTicket(randomUUID(), body);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: expect.any(String),
      fieldErrors: expect.any(Object),
    });
    await expect(prisma.ticket.count({ where: { requesterId } })).resolves.toBe(
      before,
    );
  });

  it('rejects reference IDs outside the PostgreSQL integer range', async () => {
    const before = await prisma.ticket.count({ where: { requesterId } });
    const response = await postTicket(randomUUID(), {
      ...validBody(),
      categoryId: Number.MAX_SAFE_INTEGER,
      relatedSystemId: 2_147_483_648,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: {
        categoryId: expect.any(String),
        relatedSystemId: expect.any(String),
      },
    });
    await expect(prisma.ticket.count({ where: { requesterId } })).resolves.toBe(
      before,
    );
  });

  it('returns safe JSON for a malformed JSON request body', async () => {
    const before = await prisma.ticket.count({ where: { requesterId } });
    const response = await request(app)
      .post('/api/tickets')
      .set(requesterHeader)
      .set('Idempotency-Key', randomUUID())
      .set('Content-Type', 'application/json')
      .send('{"categoryId":');

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body.error).toEqual({
      code: 'INVALID_JSON',
      message: 'Request body must contain valid JSON.',
    });
    expect(response.text).not.toMatch(/syntaxerror|stack|\\users\\|toktickit|app\.ts/i);
    await expect(prisma.ticket.count({ where: { requesterId } })).resolves.toBe(
      before,
    );
  });

  it('rejects inactive reference values and saves nothing', async () => {
    const before = await prisma.ticket.count({ where: { requesterId } });
    const response = await postTicket(randomUUID(), {
      ...validBody(),
      categoryId: inactiveCategoryId,
      relatedSystemId: inactiveRelatedSystemId,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'REFERENCE_VALUE_INACTIVE',
      fieldErrors: {
        categoryId: expect.any(String),
        relatedSystemId: expect.any(String),
      },
    });
    await expect(prisma.ticket.count({ where: { requesterId } })).resolves.toBe(
      before,
    );
  });

  it('rejects a missing or malformed Idempotency-Key', async () => {
    const missing = await request(app)
      .post('/api/tickets')
      .set(requesterHeader)
      .send(validBody());
    const malformed = await postTicket('not-a-uuid');

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(missing.body.error.code).toBe('IDEMPOTENCY_KEY_INVALID');
    expect(malformed.body.error.code).toBe('IDEMPOTENCY_KEY_INVALID');
  });

  it('replays a sequential request with the same key and canonical payload', async () => {
    const key = randomUUID();
    const first = await postTicket(key, validBody('Issue 14 sequential replay'));
    const replay = await postTicket(key, {
      ...validBody('  Issue 14 sequential replay  '),
      description: 'This is a valid Issue 14 Ticket description.\r\n',
    });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body.data.id).toBe(first.body.data.id);
    await expect(
      prisma.ticket.count({
        where: { requesterId, summary: 'Issue 14 sequential replay' },
      }),
    ).resolves.toBe(1);
  });

  it('returns 409 when the same key is reused for a different payload', async () => {
    const key = randomUUID();
    await postTicket(key, validBody('Issue 14 conflict original'));
    const conflict = await postTicket(key, validBody('Issue 14 conflict changed'));

    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('serializes concurrent same-key creates into one creation and one replay', async () => {
    const key = randomUUID();
    const body = validBody('Issue 14 concurrent replay');
    const [left, right] = await Promise.all([
      postTicket(key, body),
      postTicket(key, body),
    ]);

    expect([left.status, right.status].sort()).toEqual([200, 201]);
    expect(left.body.data.id).toBe(right.body.data.id);
    await expect(
      prisma.ticket.count({
        where: { requesterId, summary: 'Issue 14 concurrent replay' },
      }),
    ).resolves.toBe(1);
  });

  it('returns a safe correlated 500 when creation unexpectedly fails', async () => {
    const internalError = new Error('password=secret; private SQL detail');
    const transactionSpy = vi
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(internalError);
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await postTicket(randomUUID(), validBody('Issue 14 failure'));

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: 'TICKET_CREATE_FAILED',
      message: expect.any(String),
      correlationId: expect.any(String),
    });
    expect(response.text).not.toMatch(/password|secret|sql|private/i);
    expect(logSpy).toHaveBeenCalledWith('Unexpected API failure', {
      correlationId: response.body.error.correlationId,
      code: 'TICKET_CREATE_FAILED',
      operation: 'tickets.create',
      error: internalError,
    });
    transactionSpy.mockRestore();
    logSpy.mockRestore();
  });
});
