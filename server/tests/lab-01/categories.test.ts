import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { seedDatabase } from '../../prisma/seed-data.js';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

beforeAll(async () => {
  await seedDatabase(prisma);
});

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
