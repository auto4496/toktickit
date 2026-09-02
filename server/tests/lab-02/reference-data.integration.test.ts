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

const inactiveCategory = 'ZZZ Inactive Integration Category';
const inactiveRelatedSystem = 'ZZZ Inactive Integration System';

beforeAll(async () => {
  await seedDatabase(prisma);
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
  await prisma.category.deleteMany({ where: { name: inactiveCategory } });
  await prisma.relatedSystem.deleteMany({ where: { name: inactiveRelatedSystem } });
});

describe('Lab 2 seeded reference data against PostgreSQL', () => {
  it('returns seeded active Categories only, ordered by ID', async () => {
    const response = await request(app).get('/api/categories');

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
    const response = await request(app).get('/api/related-systems');
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

  it('returns seeded active Requesters only, ordered by name and email', async () => {
    const response = await request(app).get('/api/requesters');
    const activeRequesters = requesterUsers.filter((requester) => requester.isActive);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining(
        activeRequesters.map(({ id, name, email }) => ({ id, name, email })),
      ),
    );
    expect(response.body).not.toContainEqual(
      expect.objectContaining({ email: 'archived.requester@example.com' }),
    );
    expect(response.body).toEqual(
      [...response.body].sort(
        (left, right) =>
          left.name.localeCompare(right.name) || left.email.localeCompare(right.email),
      ),
    );
  });
});
