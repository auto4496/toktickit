import { sessionHeaders, fixtureCredential } from '../session-fixture.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { seedDatabase } from '../../prisma/seed-data.js';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

const userId = '99999999-9999-4999-8999-999999999992';
let headers: Awaited<ReturnType<typeof sessionHeaders>>;
beforeAll(async () => {
  await seedDatabase(prisma);
  await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, name: 'Category Test', email: 'category-test@example.test', ...fixtureCredential } });
  headers = await sessionHeaders(userId);
});

afterAll(async () => {
  await prisma.authSession.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('GET /api/categories', () => {
  it('returns the four seeded categories in a predictable order', async () => {
    const response = await request(app).get('/api/categories').set(headers);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: expect.any(Number), name: 'Account and Access' },
      { id: expect.any(Number), name: 'Hardware' },
      { id: expect.any(Number), name: 'Software' },
      { id: expect.any(Number), name: 'Network' },
    ]);
  });
});
