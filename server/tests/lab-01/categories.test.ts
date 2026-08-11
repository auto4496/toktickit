import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/categories', () => {
  it('returns the four seeded categories in a predictable order', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: expect.any(Number), name: 'Account and Access' },
      { id: expect.any(Number), name: 'Hardware' },
      { id: expect.any(Number), name: 'Software' },
      { id: expect.any(Number), name: 'Network' },
    ]);
  });
});
