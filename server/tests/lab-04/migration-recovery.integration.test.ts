import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { requireTestDatabaseUrl } from '../test-database.js';

const container = 'toktickit-lab3-test';
const schema = 'recovery_fixture';
const migrationNames = ['20260810155801_init', '20260831003000_lab2_data_requester_context', '20260913060000_lab3_accounts', '20261004000000_lab4_actions'];
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

// Never print connection URLs or child-process stderr, which may contain credentials.
function command(file: string, args: string[], input?: Buffer, env = process.env) {
  try { return execFileSync(file, args, { input, env, stdio: ['pipe', 'pipe', 'pipe'], timeout: 30_000 }); }
  catch (error) {
    const failure = error as { status?: number; stdout?: Buffer };
    if (args.includes('diff') && failure.status === 2) {
      const summary = failure.stdout?.toString().replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted]');
      throw new Error(`Prisma schema differs from the migrated test target: ${summary}`);
    }
    throw new Error(`Recovery tool ${path.basename(file)} failed; check the isolated test setup.`);
  }
}

async function snapshot(db: PrismaClient) {
  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = ${schema} AND table_type = 'BASE TABLE' ORDER BY table_name`;
  const records: Record<string, unknown[]> = {};
  for (const { table_name: table } of tables) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(table)) throw new Error('Unexpected fixture table.');
    records[table] = await db.$queryRawUnsafe(`SELECT row_to_json(r) AS data FROM "${schema}"."${table}" r ORDER BY "id"`);
  }
  const constraints = await db.$queryRaw<Array<{ conname: string; convalidated: boolean; definition: string }>>`
    SELECT c.conname, c.convalidated, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = ${schema} ORDER BY c.conname`;
  return { records, constraints };
}

it('INT-02 restores the complete Lab 3 baseline and attachment downloads after controlled Lab 4 validation failure', async () => {
  const guarded = requireTestDatabaseUrl({ testDatabaseUrl: process.env.TEST_DATABASE_URL });
  const connection = new URL(guarded);
  if (!['localhost', '127.0.0.1'].includes(connection.hostname)) throw new Error('Recovery requires the dedicated local test container.');
  const mappedPorts = command('docker', ['port', container, '5432/tcp']).toString();
  if (!mappedPorts.split(/\r?\n/).some((line) => line.endsWith(`:${connection.port}`))) throw new Error('Recovery container does not match TEST_DATABASE_URL port.');
  const user = decodeURIComponent(connection.username);
  const suffix = randomUUID().replaceAll('-', '');
  const names = [`lab4_recovery_test_source_${suffix}`, `lab4_recovery_test_target_${suffix}`];
  const created: string[] = [];
  const clients: PrismaClient[] = [];
  const admin = new PrismaClient({ datasources: { db: { url: guarded } } });
  const storage = mkdtempSync(path.join(tmpdir(), 'toktickit-recovery-test-'));
  const sourceFiles = path.join(storage, 'source', 'files');
  const backupFiles = path.join(storage, 'backup');
  const restoredFiles = path.join(storage, 'restored', 'files');
  for (const directory of [sourceFiles, backupFiles, restoredFiles]) mkdirSync(directory, { recursive: true });
  try {
    for (const name of names) {
      const target = new URL(guarded); target.pathname = `/${name}`; target.searchParams.set('schema', schema);
      requireTestDatabaseUrl({ testDatabaseUrl: target.href, developmentDatabaseUrl: guarded });
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      created.push(name);
      clients.push(new PrismaClient({ datasources: { db: { url: target.href } } }));
    }
    const [source, recovery] = clients;
    await source.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const sourceUrl = new URL(guarded); sourceUrl.pathname = `/${names[0]}`; sourceUrl.searchParams.set('schema', schema);
    const migrate = (index: number) => command(process.execPath, [
      path.resolve('server/node_modules/prisma/build/index.js'), 'db', 'execute', '--file',
      path.resolve('server/prisma/migrations', migrationNames[index], 'migration.sql'), '--url', sourceUrl.href,
    ]);
    migrate(0); migrate(1); migrate(2);
    const requester = randomUUID(); const staff = randomUUID(); const inactive = randomUUID();
    await source.user.createMany({ data: [
      { id: requester, name: 'Recovery Requester', email: 'recovery.requester@example.test', passwordHash: '!FIXTURE', mustChangePassword: false },
      { id: staff, name: 'Recovery Staff', email: 'recovery.staff@example.test', role: 'IT_STAFF', passwordHash: '!FIXTURE', mustChangePassword: false },
      { id: inactive, name: 'Inactive historical user', email: 'recovery.inactive@example.test', isActive: false, passwordHash: '!FIXTURE' },
    ] });
    const category = await source.category.create({ data: { name: 'Recovery category' } });
    const system = await source.relatedSystem.create({ data: { name: 'Recovery system' } });
    const ticketIds: string[] = [];
    for (const [index, status] of (['NEW', 'IN_PROGRESS', 'CLOSED'] as const).entries()) {
      const ticket = await source.ticket.create({ data: {
        ticketNumber: `TKT-20261005-A400000${index}`, requesterId: index === 2 ? inactive : requester,
        ownerId: index === 0 ? null : staff, categoryId: category.id, relatedSystemId: system.id,
        summary: `Baseline ${status}`, description: 'Records retained exactly through recovery.',
        requestedPriority: 'HIGH', itPriority: 'MEDIUM', currentStatus: status, version: 3,
      } });
      ticketIds.push(ticket.id);
    }
    await source.publicComment.create({ data: { ticketId: ticketIds[1], authorId: requester, content: 'Public historical reply' } });
    await source.internalNote.create({ data: { ticketId: ticketIds[1], authorId: staff, content: 'Retained internal history' } });
    await source.ticketCreateRequest.create({ data: { requesterId: requester, idempotencyKey: 'recovery-baseline-key', requestHash: 'baseline-hash', ticketId: ticketIds[1], completedAt: new Date('2026-10-04T10:00:00Z') } });
    const { createSessionMaterial } = await import('../../src/auth/tokens.js');
    const session = createSessionMaterial(false);
    await source.authSession.create({ data: { userId: requester, userVersion: 1, tokenHash: session.tokenHash, csrfToken: session.csrfToken, expiresAt: session.expiresAt } });
    const files = [
      { key: 'retained.pdf', bytes: Buffer.from('%PDF-1.4\nSynthetic recovery document'), removed: false },
      { key: 'historical.png', bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]), removed: true },
    ];
    const attachments = [];
    for (const file of files) {
      writeFileSync(path.join(sourceFiles, file.key), file.bytes);
      attachments.push(await source.attachment.create({ data: {
        ticketId: ticketIds[1], originalName: file.key, storedName: file.key, storageKey: file.key,
        mimeType: file.removed ? 'image/png' : 'application/pdf', sizeBytes: file.bytes.length,
        uploadedByRequesterId: requester,
        ...(file.removed ? { removedAt: new Date('2026-10-04T12:00:00Z'), removedByRequesterId: requester, removalReason: 'Historical removal' } : {}),
      } }));
    }
    const baseline = await snapshot(source);
    const dumpArgs = ['exec', container, 'pg_dump', '--username', user, '--dbname', names[0], '--format=custom', '--schema', schema, '--no-owner', '--no-acl'];
    const backup = command('docker', dumpArgs);
    expect(backup.subarray(0, 5).toString()).toBe('PGDMP');
    writeFileSync(path.join(storage, 'pre-lab4.dump'), backup);
    for (const file of files) copyFileSync(path.join(sourceFiles, file.key), path.join(backupFiles, file.key));
    const manifest = files.map((file) => ({ path: file.key, bytes: file.bytes.length, sha256: sha256(file.bytes) }));

    migrate(3);
    command(process.execPath, [path.resolve('server/node_modules/prisma/build/index.js'),
      'migrate', 'diff', '--from-url', sourceUrl.href, '--to-schema-datamodel',
      path.resolve('server/prisma/schema.prisma'), '--exit-code'], undefined, { ...process.env, DATABASE_URL: sourceUrl.href });
    const migrated = await snapshot(source);
    for (const [table, rows] of Object.entries(baseline.records)) expect(migrated.records[table]).toEqual(rows);
    expect(migrated.constraints).toEqual(expect.arrayContaining(baseline.constraints));
    expect(await source.actionTaken.count()).toBe(0);
    const action = await source.actionTaken.create({ data: { ticketId: ticketIds[1], assignedToId: staff, createdById: staff, performedById: staff, actionAt: new Date(), description: 'Disposable post-migration write' } });
    expect(action.status).toBe('PLANNED');
    // Deliberately simulate a failed validation after migration and a dirty source.
    // All further source writes stop here; recovery is into a separate database.
    const validateLegacyMigration = async () => {
      if (await source.actionTaken.count() !== 0) throw new Error('Controlled post-migration validation failure: unexpected Action rows');
    };
    await expect(validateLegacyMigration()).rejects.toThrow('Controlled post-migration validation failure');
    const restoreArgs = ['exec', '-i', container, 'pg_restore', '--username', user, '--dbname', names[1], '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl'];
    command('docker', restoreArgs, readFileSync(path.join(storage, 'pre-lab4.dump')));
    for (const file of files) copyFileSync(path.join(backupFiles, file.key), path.join(restoredFiles, file.key));
    expect(await snapshot(recovery)).toEqual(baseline);
    const actionTables = await recovery.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM information_schema.tables WHERE table_schema = ${schema}
      AND table_name IN ('ActionTaken', 'ActionRevision', 'ActionCreateRequest')`;
    expect(Number(actionTables[0].count)).toBe(0);
    const actionTypes = await recovery.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname=${schema} AND t.typname IN ('ActionStatus', 'ActionOperation')`;
    expect(Number(actionTypes[0].count)).toBe(0);
    const orphans = await recovery.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM "Ticket" t LEFT JOIN "User" r ON r.id=t."requesterId"
      LEFT JOIN "User" o ON o.id=t."ownerId" LEFT JOIN "Category" c ON c.id=t."categoryId"
      LEFT JOIN "RelatedSystem" s ON s.id=t."relatedSystemId"
      WHERE r.id IS NULL OR (t."ownerId" IS NOT NULL AND o.id IS NULL) OR c.id IS NULL OR s.id IS NULL`;
    expect(Number(orphans[0].count)).toBe(0);
    for (const entry of manifest) {
      const restored = readFileSync(path.join(restoredFiles, entry.path));
      expect(restored.length).toBe(entry.bytes); expect(sha256(restored)).toBe(entry.sha256);
    }

    // Use the real application/auth/storage code with only its database binding
    // redirected to the restored target; no fake download handler or response.
    vi.stubEnv('ATTACHMENT_STORAGE_DIR', path.join(storage, 'restored'));
    vi.resetModules();
    vi.doMock('../../src/prisma.js', () => ({ default: recovery }));
    const { default: app } = await import('../../src/app.js');
    const download = await request(app).get(`/api/attachments/${attachments[0].id}/download`).set('Cookie', `toktickit.sid=${session.token}`);
    expect(download.status).toBe(200);
    expect(Buffer.from(download.body)).toEqual(files[0].bytes);
    expect(sha256(Buffer.from(download.body))).toBe(manifest[0].sha256);
    expect((await request(app).get(`/api/attachments/${attachments[1].id}/download`).set('Cookie', `toktickit.sid=${session.token}`)).status).toBe(404);
    const evidenceDir = path.resolve('artifacts/lab-04/data-foundation');
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(path.join(evidenceDir, 'recovery.json'), `${JSON.stringify({
      check: 'INT-02', result: 'PASS', observedAt: new Date().toISOString(),
      targets: names.map((database) => ({ host: connection.hostname, port: connection.port, database, schema })),
      tools: ['pg_dump', 'pg_restore'].map((tool) => command('docker', ['exec', container, tool, '--version']).toString().trim()),
      commands: { backup: `docker ${dumpArgs.join(' ')}`, restore: `docker ${restoreArgs.join(' ')} < pre-lab4.dump` },
      backupSha256: sha256(backup), backupBytes: backup.length,
      controlledFailure: 'Controlled post-migration validation failure; source writes stopped',
      tableCounts: Object.fromEntries(Object.entries(baseline.records).map(([table, rows]) => [table, rows.length])),
      migrations: migrationNames, migratedBaselineComparison: 'PASS',
      fullRecordAndConstraintComparison: 'PASS', ticketOrphans: 0, recoveredActionTables: 0, recoveredActionTypes: 0,
      prismaSchemaComparison: 'PASS (migrate diff --exit-code)',
      attachments: manifest, authenticatedDownload: 'PASS', removedDownloadStatus: 404,
    }, null, 2)}\n`);
  } finally {
    vi.doUnmock('../../src/prisma.js'); vi.unstubAllEnvs(); vi.resetModules();
    for (const client of clients) await client.$disconnect();
    for (const name of created.reverse()) {
      if (!names.includes(name) || !/^lab4_recovery_test_(source|target)_[a-f0-9]{32}$/.test(name)) throw new Error('Unsafe recovery cleanup target.');
      await admin.$executeRawUnsafe(`DROP DATABASE "${name}"`);
    }
    await admin.$disconnect();
    const resolved = path.resolve(storage); const relative = path.relative(path.resolve(tmpdir()), resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !/^toktickit-recovery-test-[^\\/]+$/.test(relative)) throw new Error('Unsafe recovery storage cleanup path.');
    rmSync(resolved, { recursive: true, force: true });
  }
}, 180_000);
