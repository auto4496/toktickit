import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/prisma.js', () => ({
  default: {
    category: { findMany: vi.fn() },
    relatedSystem: { findMany: vi.fn() },
    authSession: { findUnique: vi.fn() },
  },
}));

import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

const prismaMock = prisma as unknown as {
  category: { findMany: ReturnType<typeof vi.fn> };
  relatedSystem: { findMany: ReturnType<typeof vi.fn> };
  authSession: { findUnique: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.authSession.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now()+60_000), userVersion: 1, user: { isActive: true, version: 1, mustChangePassword: false, role: 'REQUESTER' } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Lab 2 reference-data APIs', () => {
  it('returns only active Categories in ascending ID order', async () => {
    prismaMock.category.findMany.mockResolvedValue([
      { id: 1, name: 'Account and Access' },
      { id: 4, name: 'Network' },
    ]);

    const response = await request(app).get('/api/categories').set('Cookie', 'toktickit.sid=' + 'a'.repeat(64));

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
      { id: 1, name: 'ERP' },
      { id: 2, name: 'Email and Collaboration' },
    ]);

    const response = await request(app).get('/api/related-systems').set('Cookie', 'toktickit.sid=' + 'a'.repeat(64));

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

  it('removes the development requester directory', async () => {
    expect((await request(app).get('/api/requesters').set('Cookie', 'toktickit.sid=' + 'a'.repeat(64))).status).toBe(404);
  });

  it.each([
    ['/api/categories', 'category', 'REFERENCE_DATA_UNAVAILABLE', 'categories.list'],
    ['/api/related-systems', 'relatedSystem', 'REFERENCE_DATA_UNAVAILABLE', 'related-systems.list'],
  ] as const)(
    'returns a safe error when %s lookup fails',
    async (path, model, code, operation) => {
      const internalError = new Error(
        'password=secret; SELECT * FROM private_table',
      );
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      prismaMock[model].findMany.mockRejectedValue(internalError);

      const response = await request(app).get(path).set('Cookie', 'toktickit.sid=' + 'a'.repeat(64));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: {
          code,
          message: expect.any(String),
          correlationId: expect.any(String),
        },
      });
      expect(response.text).not.toMatch(/password|secret|select|private_table/i);
      expect(logSpy).toHaveBeenCalledWith('Unexpected API failure', {
        correlationId: response.body.error.correlationId,
        code,
        operation,
        error: internalError,
      });
    },
  );
});
