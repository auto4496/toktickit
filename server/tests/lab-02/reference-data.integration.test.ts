import { sessionHeaders, fixtureCredential } from '../session-fixture.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  categoryNames,
  relatedSystemNames,
  requesterUsers,
  seedDatabase,
} from '../../prisma/seed-data.js';
import app from '../../src/app.js';
import prisma from '../../src/prisma.js';

const accountId = '99999999-9999-4999-8999-999999999991';
let headers: Awaited<ReturnType<typeof sessionHeaders>>;
const inactiveCategory = 'ZZZ Inactive Integration Category';
const inactiveRelatedSystem = 'ZZZ Inactive Integration System';

beforeAll(async () => {
  await seedDatabase(prisma);
  await prisma.user.upsert({ where: { id: accountId }, update: {}, create: { id: accountId, name: 'Reference Test', email: 'reference-test@example.test', ...fixtureCredential } });
  headers = await sessionHeaders(accountId);
  await prisma.category.upsert({
    where: { name: inactiveCategory },
    update: { isActive: false },
    create: { name: inactiveCategory, isActive: false },
  });
  await prisma.relatedSystem.upsert({
    where: { name: inactiveRelatedSystem },
    update: { isActive: false },
    create: { name: inactiveRelatedSystem, isActive: false },
  });
});

afterAll(async () => {
  await prisma.authSession.deleteMany({ where: { userId: accountId } });
  await prisma.user.deleteMany({ where: { id: accountId } });
  await prisma.category.deleteMany({ where: { name: inactiveCategory } });
  await prisma.relatedSystem.deleteMany({ where: { name: inactiveRelatedSystem } });
});

describe('Lab 2 seeded reference data against PostgreSQL', () => {
  it('returns seeded active Categories only, ordered by ID', async () => {
    const response = await request(app).get('/api/categories').set(headers);

    expect(response.status).toBe(200);
    expect(response.body.map(({ name }: { name: string }) => name)).toEqual(
      expect.arrayContaining([...categoryNames]),
    );
    expect(response.body).not.toContainEqual(
      expect.objectContaining({ name: inactiveCategory }),
    );
    expect(response.body.map(({ id }: { id: number }) => id)).toEqual(
      [...response.body]
        .map(({ id }: { id: number }) => id)
        .sort((left, right) => left - right),
    );
  });

  it('returns seeded active Related Systems only, case-insensitively sorted', async () => {
    const response = await request(app).get('/api/related-systems').set(headers);
    const names = response.body.map(({ name }: { name: string }) => name);

    expect(response.status).toBe(200);
    expect(names).toEqual(expect.arrayContaining([...relatedSystemNames]));
    expect(names).not.toContain(inactiveRelatedSystem);
    expect(names).toEqual(
      [...names].sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' }),
      ),
    );
  });

  it('does not expose the former requester selector directory', async () => {
    expect((await request(app).get('/api/requesters').set(headers)).status).toBe(404);
  });
});
