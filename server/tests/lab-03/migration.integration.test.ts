import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { requireTestDatabaseUrl } from '../test-database.js';
import { initializePasswords, INITIAL_PASSWORD_REQUIRED } from '../../prisma/initialize-passwords.js';
import { verifyPassword } from '../../src/auth/password.js';
import { seedDatabase } from '../../prisma/seed-data.js';

const root = process.cwd();
const migrations = ['20260810155801_init', '20260831003000_lab2_data_requester_context', '20260913060000_lab3_accounts'];
async function isolated(run: (db: PrismaClient, migrate: (index: number) => void) => Promise<void>) {
  const target = requireTestDatabaseUrl({ testDatabaseUrl: process.env.TEST_DATABASE_URL });
  const schema = `migration_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new PrismaClient({ datasources: { db: { url: target } } });
  const url = new URL(target); url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: url.href } } });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  try {
    const migrate = (index: number) => execFileSync(process.execPath, [
      path.join(root, 'server/node_modules/prisma/build/index.js'), 'db', 'execute',
      '--file', path.join(root, 'server/prisma/migrations', migrations[index], 'migration.sql'), '--url', url.href,
    ], { stdio: 'pipe', timeout: 30_000 });
    await run(db, migrate);
  } finally {
    await db.$disconnect();
    // Only this randomly named schema, created in a guarded test DB above.
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}

describe('Lab 2 to Lab 3 data migration', () => {
  it('preserves historical identities and attachment/idempotency relations and initializes passwords resumably', async () => isolated(async (db, migrate) => {
    migrate(0); migrate(1);
    await db.$executeRaw`INSERT INTO "RequesterUser" ("id","name","email") VALUES ('legacy-user','Legacy User',' Legacy@Example.test ')`;
    await db.$executeRaw`INSERT INTO "Category" ("id","name") VALUES (1,'Legacy category')`;
    await db.$executeRaw`INSERT INTO "RelatedSystem" ("id","name") VALUES (1,'Legacy system')`;
    await db.$executeRaw`INSERT INTO "Ticket" ("id","ticketNumber","requesterId","categoryId","relatedSystemId","summary","requestedPriority","description") VALUES ('legacy-ticket','TKT-20260901-ABCD1234','legacy-user',1,1,'Legacy issue','HIGH','Legacy issue description')`;
    await db.$executeRaw`INSERT INTO "Attachment" ("id","ticketId","originalName","storedName","mimeType","sizeBytes","storageKey","uploadedByRequesterId","removedByRequesterId","removedAt","removalReason") VALUES ('legacy-attachment','legacy-ticket','example.pdf','retained.pdf','application/pdf',42,'retained.pdf','legacy-user','legacy-user',CURRENT_TIMESTAMP,'Uploaded incorrect file')`;
    await db.$executeRaw`INSERT INTO "TicketCreateRequest" ("id","requesterId","idempotencyKey","requestHash","ticketId") VALUES ('legacy-create','legacy-user','legacy-key','unchanged-hash','legacy-ticket')`;
    const attachments = await db.$queryRaw`SELECT * FROM "Attachment"`;
    const requests = await db.$queryRaw`SELECT * FROM "TicketCreateRequest"`;
    const dates = await db.$queryRaw`SELECT "createdAt","updatedAt" FROM "RequesterUser"`;
    migrate(2);
    expect(await db.$queryRaw`SELECT * FROM "Attachment"`).toEqual(attachments);
    expect(await db.$queryRaw`SELECT * FROM "TicketCreateRequest"`).toEqual(requests);
    expect(await db.$queryRaw`SELECT "createdAt","updatedAt" FROM "User"`).toEqual(dates);
    const ticket = await db.ticket.findUniqueOrThrow({ where: { id: 'legacy-ticket' }, include: { requester: true } });
    expect(ticket).toMatchObject({ requesterId: 'legacy-user', itPriority: 'HIGH', currentStatus: 'NEW', ownerId: null, version: 1 });
    expect(ticket.requester).toMatchObject({ email: 'legacy@example.test', passwordHash: INITIAL_PASSWORD_REQUIRED, mustChangePassword: true });
    await expect(initializePasswords(db, {})).rejects.toThrow('No accounts were changed');
    const password = 'A private synthetic initial password';
    expect(await initializePasswords(db, { 'legacy-user': password })).toBe(1);
    const user = await db.user.findUniqueOrThrow({ where: { id: 'legacy-user' } });
    expect(await verifyPassword(password, user.passwordHash)).toBe(true);
    expect(await initializePasswords(db, {})).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe(user.passwordHash);
  }), 90_000);

  it('stops on normalized-email collisions without renaming or merging accounts', async () => isolated(async (db, migrate) => {
    migrate(0); migrate(1);
    await db.$executeRaw`INSERT INTO "RequesterUser" ("id","name","email") VALUES ('first','First','Name@example.test'),('second','Second',' name@example.test ')`;
    expect(() => migrate(2)).toThrow();
    expect(await db.$queryRaw`SELECT "id" FROM "RequesterUser" ORDER BY "id"`).toEqual([{ id: 'first' }, { id: 'second' }]);
  }), 90_000);

  it('seeds all roles and varied tickets, preserving edits, inactive accounts and changed passwords on repeat', async () => isolated(async (db, migrate) => {
    migrate(0); migrate(1); migrate(2); await seedDatabase(db);
    expect(await db.user.count({ where: { role: 'REQUESTER', isActive: true } })).toBeGreaterThanOrEqual(4);
    expect(await db.user.count({ where: { role: 'REQUESTER', isActive: false } })).toBeGreaterThanOrEqual(1);
    expect(await db.user.count({ where: { role: 'IT_STAFF', isActive: true } })).toBeGreaterThanOrEqual(3);
    expect(await db.user.count({ where: { role: 'IT_STAFF', isActive: false } })).toBeGreaterThanOrEqual(1);
    expect(await db.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } })).toBeGreaterThanOrEqual(1);
    expect(await db.ticket.count()).toBe(8);
    expect(await db.publicComment.count()).toBeGreaterThan(0);
    expect(await db.internalNote.count()).toBeGreaterThan(0);
    const user = await db.user.findFirstOrThrow({ where: { role: 'REQUESTER' } });
    await db.user.update({ where: { id: user.id }, data: { name: 'Edited name', isActive: false, passwordHash: '!EDITED_SENTINEL' } });
    const ticket = await db.ticket.findFirstOrThrow();
    await db.ticket.update({ where: { id: ticket.id }, data: { summary: 'Preserve my edited summary' } });
    await seedDatabase(db);
    expect(await db.user.findUnique({ where: { id: user.id } })).toMatchObject({ name: 'Edited name', isActive: false, passwordHash: '!EDITED_SENTINEL' });
    expect(await db.ticket.findUnique({ where: { id: ticket.id } })).toMatchObject({ summary: 'Preserve my edited summary' });
    expect(await db.ticket.count()).toBe(8);
  }), 90_000);
});
