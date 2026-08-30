import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/prisma.js', () => ({
  default: {
    category: { findMany: vi.fn() },
    relatedSystem: { findMany: vi.fn() },
    requesterUser: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

const prismaMock = prisma as unknown as {
  category: { findMany: ReturnType<typeof vi.fn> };
  relatedSystem: { findMany: ReturnType<typeof vi.fn> };
  requesterUser: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Lab 2 reference-data APIs', () => {
  it('returns only active Categories in ascending ID order', async () => {
    prismaMock.category.findMany.mockResolvedValue([
      { id: 1, name: 'Account and Access' },
      { id: 4, name: 'Network' },
    ]);

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, name: 'Account and Access' },
      { id: 4, name: 'Network' },
    ]);
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  });

  it('returns active Related Systems in case-insensitive name order', async () => {
    prismaMock.relatedSystem.findMany.mockResolvedValue([
      { id: 2, name: 'Email and Collaboration' },
      { id: 1, name: 'ERP' },
    ]);

    const response = await request(app).get('/api/related-systems');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 2, name: 'Email and Collaboration' },
      { id: 1, name: 'ERP' },
    ]);
    expect(prismaMock.relatedSystem.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true },
    });
  });

  it('returns active Requesters ordered by name and email without private fields', async () => {
    prismaMock.requesterUser.findMany.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@example.test',
      },
    ]);

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@example.test',
      },
    ]);
    expect(prismaMock.requesterUser.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
    expect(response.text).not.toMatch(/password|token|role/i);
  });

  it.each([
    ['/api/categories', 'category', 'REFERENCE_DATA_UNAVAILABLE'],
    ['/api/related-systems', 'relatedSystem', 'REFERENCE_DATA_UNAVAILABLE'],
    ['/api/requesters', 'requesterUser', 'REQUESTERS_UNAVAILABLE'],
  ] as const)(
    'returns a safe error when %s lookup fails',
    async (path, model, code) => {
      prismaMock[model].findMany.mockRejectedValue(
        new Error('password=secret; SELECT * FROM private_table'),
      );

      const response = await request(app).get(path);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: {
          code,
          message: expect.any(String),
          correlationId: expect.any(String),
        },
      });
      expect(response.text).not.toMatch(/password|secret|select|private_table/i);
    },
  );
});
