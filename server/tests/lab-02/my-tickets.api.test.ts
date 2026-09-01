import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { seedDatabase } from '../../prisma/seed-data.js';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

const requesterAId = '77777777-7777-4777-8777-777777777771';
const requesterBId = '77777777-7777-4777-8777-777777777772';
const requesterAHeader = { 'X-Requester-Id': requesterAId };

let categoryOneId: number;
let categoryTwoId: number;
let relatedSystemId: number;

const listTickets = (query = '') =>
  request(app).get(`/api/tickets${query}`).set(requesterAHeader);

beforeAll(async () => {
  await seedDatabase(prisma);
  await prisma.ticketCreateRequest.deleteMany({
    where: { requesterId: { in: [requesterAId, requesterBId] } },
  });
  await prisma.ticket.deleteMany({
    where: { requesterId: { in: [requesterAId, requesterBId] } },
  });
  await prisma.requesterUser.deleteMany({
    where: { id: { in: [requesterAId, requesterBId] } },
  });

  await prisma.requesterUser.createMany({
    data: [
      {
        id: requesterAId,
        name: 'Issue 15 Requester A',
        email: 'issue15.a@example.test',
        isActive: true,
      },
      {
        id: requesterBId,
        name: 'Issue 15 Requester B',
        email: 'issue15.b@example.test',
        isActive: true,
      },
    ],
  });

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    take: 2,
  });
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });
  categoryOneId = categories[0].id;
  categoryTwoId = categories[1].id;
  relatedSystemId = relatedSystem.id;

  await prisma.ticket.createMany({
    data: Array.from({ length: 12 }, (_, index) => ({
      ticketNumber: `TKT-20260901-15${String(index + 1).padStart(6, '0')}`,
      requesterId: requesterAId,
      categoryId: index % 2 === 0 ? categoryOneId : categoryTwoId,
      relatedSystemId,
      summary:
        index === 0
          ? 'VPN disconnect search target'
          : `Issue 15 owned Ticket ${index + 1}`,
      requestedPriority: ['LOW', 'MEDIUM', 'HIGH'][index % 3] as
        | 'LOW'
        | 'MEDIUM'
        | 'HIGH',
      description:
        index === 1
          ? 'The zebra marker appears only in this owned description.'
          : `Description for owned Ticket ${index + 1}.`,
      currentStatus: 'NEW',
      createdAt: new Date(Date.UTC(2026, 8, 1, 0, index)),
      updatedAt: new Date(Date.UTC(2026, 8, 2, 0, Math.floor(index / 2))),
    })),
  });

  await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-20260901-15999999',
      requesterId: requesterBId,
      categoryId: categoryOneId,
      relatedSystemId,
      summary: 'VPN disconnect private requester data',
      requestedPriority: 'HIGH',
      description: 'This zebra marker must never cross requester boundaries.',
      currentStatus: 'NEW',
      createdAt: new Date(Date.UTC(2026, 8, 3)),
      updatedAt: new Date(Date.UTC(2026, 8, 3)),
    },
  });
});

afterAll(async () => {
  await prisma.ticketCreateRequest.deleteMany({
    where: { requesterId: { in: [requesterAId, requesterBId] } },
  });
  await prisma.ticket.deleteMany({
    where: { requesterId: { in: [requesterAId, requesterBId] } },
  });
  await prisma.requesterUser.deleteMany({
    where: { id: { in: [requesterAId, requesterBId] } },
  });
});

describe('GET /api/tickets', () => {
  it('returns only the selected Requester tickets with defaults and accurate metadata', async () => {
    const response = await listTickets();

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 12,
      totalPages: 2,
      sortBy: 'updatedAt',
      sortDirection: 'desc',
    });
    expect(response.body.data).toHaveLength(10);
    expect(response.body.data[0].ticketNumber).toBe('TKT-20260901-15000012');
    expect(response.body.data[1].ticketNumber).toBe('TKT-20260901-15000011');
    expect(response.text).not.toContain('TKT-20260901-15999999');
    expect(response.body.data[0]).toEqual({
      id: expect.any(String),
      ticketNumber: expect.any(String),
      ticketDate: expect.any(String),
      summary: expect.any(String),
      category: { id: expect.any(Number), name: expect.any(String) },
      relatedSystem: { id: expect.any(Number), name: expect.any(String) },
      requestedPriority: expect.stringMatching(/^(LOW|MEDIUM|HIGH)$/),
      itPriority: null,
      currentStatus: 'NEW',
      updatedAt: expect.any(String),
    });
  });

  it('searches Ticket Number, Summary, and Description case-insensitively after trimming', async () => {
    const byNumber = await listTickets('?search=15000003&pageSize=20');
    const bySummary = await listTickets('?search=%20vpn%20disconnect%20&pageSize=20');
    const byDescription = await listTickets('?search=ZeBrA&pageSize=20');
    const literalWildcard = await listTickets('?search=%25&pageSize=20');

    expect(byNumber.body.data.map((ticket: { ticketNumber: string }) => ticket.ticketNumber)).toEqual([
      'TKT-20260901-15000003',
    ]);
    expect(bySummary.body.data).toHaveLength(1);
    expect(bySummary.body.data[0].ticketNumber).toBe('TKT-20260901-15000001');
    expect(byDescription.body.data).toHaveLength(1);
    expect(byDescription.body.data[0].ticketNumber).toBe('TKT-20260901-15000002');
    expect(byDescription.text).not.toContain('15999999');
    expect(literalWildcard.body.data).toEqual([]);
  });

  it('applies each filter without losing Requester ownership', async () => {
    const category = await listTickets(`?categoryId=${categoryTwoId}&pageSize=20`);
    const priority = await listTickets('?requestedPriority=HIGH&pageSize=20');
    const status = await listTickets('?currentStatus=NEW&pageSize=20');

    expect(category.body.data).toHaveLength(6);
    expect(
      category.body.data.every(
        (ticket: { category: { id: number } }) => ticket.category.id === categoryTwoId,
      ),
    ).toBe(true);
    expect(priority.body.data).toHaveLength(4);
    expect(
      priority.body.data.every(
        (ticket: { requestedPriority: string }) => ticket.requestedPriority === 'HIGH',
      ),
    ).toBe(true);
    expect(status.body.data).toHaveLength(12);
  });

  it('sorts every supported field deterministically, including explicit priority rank', async () => {
    const created = await listTickets(
      '?sortBy=createdAt&sortDirection=asc&pageSize=20',
    );
    const ticketNumber = await listTickets(
      '?sortBy=ticketNumber&sortDirection=asc&pageSize=20',
    );
    const priorityAsc = await listTickets(
      '?sortBy=requestedPriority&sortDirection=asc&pageSize=20',
    );
    const priorityDesc = await listTickets(
      '?sortBy=requestedPriority&sortDirection=desc&pageSize=20',
    );
    const prioritySecondPage = await listTickets(
      '?sortBy=requestedPriority&sortDirection=asc&page=2',
    );

    expect(created.body.data[0].ticketNumber).toBe('TKT-20260901-15000001');
    expect(ticketNumber.body.data[0].ticketNumber).toBe('TKT-20260901-15000001');
    expect(
      priorityAsc.body.data.map(
        (ticket: { requestedPriority: string }) => ticket.requestedPriority,
      ),
    ).toEqual([
      'LOW', 'LOW', 'LOW', 'LOW',
      'MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM',
      'HIGH', 'HIGH', 'HIGH', 'HIGH',
    ]);
    expect(
      priorityDesc.body.data.map(
        (ticket: { requestedPriority: string }) => ticket.requestedPriority,
      ),
    ).toEqual([
      'HIGH', 'HIGH', 'HIGH', 'HIGH',
      'MEDIUM', 'MEDIUM', 'MEDIUM', 'MEDIUM',
      'LOW', 'LOW', 'LOW', 'LOW',
    ]);
    expect(priorityAsc.body.data.slice(0, 4).map((ticket: { ticketNumber: string }) => ticket.ticketNumber)).toEqual([
      'TKT-20260901-15000010',
      'TKT-20260901-15000007',
      'TKT-20260901-15000004',
      'TKT-20260901-15000001',
    ]);
    expect(
      prioritySecondPage.body.data.map(
        (item: { requestedPriority: string }) => item.requestedPriority,
      ),
    ).toEqual(['HIGH', 'HIGH']);
  });

  it('uses one-based pagination and returns an empty out-of-range page safely', async () => {
    const secondPage = await listTickets('?page=2');
    const outOfRange = await listTickets('?page=99');

    expect(secondPage.body.data).toHaveLength(2);
    expect(secondPage.body.meta).toMatchObject({ page: 2, totalItems: 12, totalPages: 2 });
    expect(outOfRange.status).toBe(200);
    expect(outOfRange.body.data).toEqual([]);
    expect(outOfRange.body.meta).toMatchObject({ page: 99, totalItems: 12, totalPages: 2 });
  });

  it.each([
    ['?search=%20', 'search'],
    ['?categoryId=0', 'categoryId'],
    ['?categoryId=2147483648', 'categoryId'],
    ['?requestedPriority=high', 'requestedPriority'],
    ['?currentStatus=CLOSED', 'currentStatus'],
    ['?sortBy=summary', 'sortBy'],
    ['?sortDirection=sideways', 'sortDirection'],
    ['?page=0', 'page'],
    ['?pageSize=25', 'pageSize'],
    ['?page=1&page=2', 'page'],
    ['?unknown=value', 'unknown'],
  ])('returns safe field errors for invalid query %s', async (query, field) => {
    const response = await listTickets(query);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'INVALID_QUERY_PARAMETER',
      message: expect.any(String),
      fieldErrors: { [field]: expect.any(String) },
    });
  });

  it('rejects a Category filter that does not reference a Category', async () => {
    const response = await listTickets('?categoryId=2147483647');

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: 'INVALID_QUERY_PARAMETER',
      fieldErrors: { categoryId: expect.any(String) },
    });
  });

  it('requires a valid active Requester context', async () => {
    const missing = await request(app).get('/api/tickets');
    const malformed = await request(app)
      .get('/api/tickets')
      .set('X-Requester-Id', 'not-a-uuid');

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(missing.body.error.code).toBe('REQUESTER_CONTEXT_REQUIRED');
    expect(malformed.body.error.code).toBe('REQUESTER_CONTEXT_INVALID');
  });

  it('returns a safe correlated failure without internal details', async () => {
    const internalError = new Error('password=secret; SELECT private_table');
    const transactionSpy = vi
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(internalError);
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await listTickets();

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: 'TICKET_LIST_FAILED',
      message: 'Tickets could not be loaded. Try again.',
      correlationId: expect.any(String),
    });
    expect(response.text).not.toMatch(/password|secret|select|private_table/i);
    expect(logSpy).toHaveBeenCalledWith('Unexpected API failure', {
      correlationId: response.body.error.correlationId,
      code: 'TICKET_LIST_FAILED',
      operation: 'tickets.list',
      error: internalError,
    });
    transactionSpy.mockRestore();
    logSpy.mockRestore();
  });
});
