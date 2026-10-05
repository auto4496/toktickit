import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { requireTestDatabaseUrl } from '../test-database.js';
import { initializePasswords, INITIAL_PASSWORD_REQUIRED } from '../../prisma/initialize-passwords.js';
import { verifyPassword } from '../../src/auth/password.js';
import { seedDatabase } from '../../prisma/seed-data.js';

const root = process.cwd();
const migrations = ['20260810155801_init', '20260831003000_lab2_data_requester_context', '20260913060000_lab3_accounts', '20261004000000_lab4_actions'];
async function isolated(run: (db: PrismaClient, migrate: (index: number) => void) => Promise<void>) {
  const target = requireTestDatabaseUrl({ testDatabaseUrl: process.env.TEST_DATABASE_URL });
  const schema = `migration_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new PrismaClient({ datasources: { db: { url: target } } });
  const url = new URL(target); url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: url.href } } });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const storage = mkdtempSync(path.join(tmpdir(), 'toktickit-migration-test-'));
  const attachmentPath = path.join(storage, 'retained.pdf');
  writeFileSync(attachmentPath, Buffer.from('%PDF-1.4\nSynthetic retained migration bytes'));
  const checksum = () => createHash('sha256').update(readFileSync(attachmentPath)).digest('hex');
  const originalChecksum = checksum();
  try {
    const migrate = (index: number) => { execFileSync(process.execPath, [
      path.join(root, 'server/node_modules/prisma/build/index.js'), 'db', 'execute',
      '--file', path.join(root, 'server/prisma/migrations', migrations[index], 'migration.sql'), '--url', url.href,
    ], { stdio: 'pipe', timeout: 30_000 });
      expect(checksum()).toBe(originalChecksum);
    };
    await run(db, migrate);
  } finally {
    await db.$disconnect();
    // Only this randomly named schema, created in a guarded test DB above.
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
    unlinkSync(attachmentPath);
    rmdirSync(storage);
  }
}

describe('Lab 2 through Lab 4 data migrations', () => {
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
    const retainedTicket = await db.ticket.findUniqueOrThrow({ where: { id: 'legacy-ticket' } });
    migrate(3);
    expect(await db.ticket.findUniqueOrThrow({ where: { id: 'legacy-ticket' } })).toEqual(retainedTicket);
    expect(await db.$queryRaw`SELECT * FROM "Attachment"`).toEqual(attachments);
    expect(await db.$queryRaw`SELECT * FROM "TicketCreateRequest"`).toEqual(requests);
    expect(await db.actionTaken.count({ where: { ticketId: 'legacy-ticket' } })).toBe(0);
  }), 90_000);

  it('stops on normalized-email collisions without renaming or merging accounts', async () => isolated(async (db, migrate) => {
    migrate(0); migrate(1);
    await db.$executeRaw`INSERT INTO "RequesterUser" ("id","name","email") VALUES ('first','First','Name@example.test'),('second','Second',' name@example.test ')`;
    expect(() => migrate(2)).toThrow();
    expect(await db.$queryRaw`SELECT "id" FROM "RequesterUser" ORDER BY "id"`).toEqual([{ id: 'first' }, { id: 'second' }]);
  }), 90_000);

  it('seeds all roles and varied tickets, preserving edits, inactive accounts and changed passwords on repeat', async () => isolated(async (db, migrate) => {
    migrate(0); migrate(1); migrate(2); migrate(3); await seedDatabase(db);
    expect(await db.user.count({ where: { role: 'REQUESTER', isActive: true } })).toBeGreaterThanOrEqual(4);
    expect(await db.user.count({ where: { role: 'REQUESTER', isActive: false } })).toBeGreaterThanOrEqual(1);
    expect(await db.user.count({ where: { role: 'IT_STAFF', isActive: true } })).toBeGreaterThanOrEqual(3);
    expect(await db.user.count({ where: { role: 'IT_STAFF', isActive: false } })).toBeGreaterThanOrEqual(1);
    expect(await db.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } })).toBeGreaterThanOrEqual(1);
    expect(await db.ticket.count()).toBe(8);
    expect(await db.actionTaken.count()).toBe(5);
    expect(await db.actionRevision.count()).toBe(5);
    const seededActions = await db.actionTaken.findMany({ orderBy: { id: 'asc' } });
    expect(new Set(seededActions.map((action) => action.status))).toEqual(new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED']));
    const action = seededActions[0];
    await db.actionTaken.update({ where: { id: action.id }, data: { description: 'Human-edited Action', result: 'Preserve this result', version: 2 } });
    const retainedActions = await db.actionTaken.findMany({ orderBy: { id: 'asc' } });
    const retainedRevisions = await db.actionRevision.findMany({ orderBy: { id: 'asc' } });
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
    expect(await db.actionTaken.count()).toBe(5);
    expect(await db.actionTaken.findMany({ orderBy: { id: 'asc' } })).toEqual(retainedActions);
    expect(await db.actionRevision.findMany({ orderBy: { id: 'asc' } })).toEqual(retainedRevisions);
    await expect(db.user.delete({ where: { id: action.performedById } })).rejects.toThrow();
    await expect(db.actionTaken.delete({ where: { id: action.id } })).rejects.toThrow();
  }), 90_000);

  it('rejects production seeding before accessing the database', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try { await expect(seedDatabase({} as PrismaClient)).rejects.toThrow('Local seed is not available in production.'); }
    finally { vi.unstubAllEnvs(); }
  });
});
