import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Prisma, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { createSessionMaterial } from '../../src/auth/tokens.js';
import { requireTestDatabaseUrl } from '../test-database.js';

it('keeps both dashboards bounded and accurate at 5,000 Tickets / 10,000 Actions, with natural query plans', async () => {
  const target = requireTestDatabaseUrl({ testDatabaseUrl: process.env.TEST_DATABASE_URL });
  const schema = `dashboard_smoke_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new PrismaClient({ datasources: { db: { url: target } } });
  const scoped = new URL(target); scoped.searchParams.set('schema', schema);
  const queries: string[] = [];
  const db = new PrismaClient({ datasources: { db: { url: scoped.href } }, log: [{ emit: 'event', level: 'query' }] });
  db.$on('query', event => queries.push(event.query));
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  try {
    for (const migration of ['20260810155801_init', '20260831003000_lab2_data_requester_context', '20260913060000_lab3_accounts', '20261004000000_lab4_actions']) {
      execFileSync(process.execPath, [path.resolve('server/node_modules/prisma/build/index.js'), 'db', 'execute', '--file', path.resolve('server/prisma/migrations', migration, 'migration.sql'), '--url', scoped.href], { stdio: 'pipe', timeout: 30_000 });
    }
    const requesters = Array.from({ length: 100 }, () => randomUUID());
    const staff = Array.from({ length: 20 }, () => randomUUID());
    await db.user.createMany({ data: [...requesters, ...staff].map((id, i) => ({ id, name: `Smoke actor ${i}`, email: `${id}@example.test`, role: i < 100 ? 'REQUESTER' : 'IT_STAFF', passwordHash: '!TEST_SESSION_ONLY', mustChangePassword: false })) });
    const category = await db.category.create({ data: { name: 'Smoke category' } });
    const system = await db.relatedSystem.create({ data: { name: 'Smoke system' } });
    const statuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'] as const;
    const open = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] as const;
    const now = new Date();
    const tickets = Array.from({ length: 5_000 }, (_, i) => ({
      id: randomUUID(), ticketNumber: `SMOKE-${String(i).padStart(5, '0')}`, requesterId: requesters[i % 100],
      categoryId: category.id, relatedSystemId: system.id, summary: `Smoke Ticket ${i}`,
      description: 'Private detail omitted from dashboard. '.repeat(50), requestedPriority: 'HIGH' as const,
      itPriority: (['LOW', 'MEDIUM', 'HIGH'] as const)[i % 3], ownerId: i % 4 === 0 ? null : staff[i % 20],
      currentStatus: statuses[Math.floor(i / 100) % 8], updatedAt: new Date(now.getTime() - i * 1000),
    }));
    // Bound createMany batches below PostgreSQL's parameter limit.
    for (let i = 0; i < tickets.length; i += 250) await db.ticket.createMany({ data: tickets.slice(i, i + 250) });
    for (let i = 0; i < tickets.length; i += 250) await db.actionTaken.createMany({ data: tickets.slice(i, i + 250).flatMap((ticket, offset) => [0, 1].map(index => ({
      ticketId: ticket.id, assignedToId: staff[(i + offset) % 20], createdById: staff[0], performedById: staff[0],
      actionAt: now, description: `Smoke Action ${index}`, status: index ? 'COMPLETED' as const : 'PLANNED' as const,
      result: index ? 'Documented completion' : '', followUpRequired: true, followUpNote: 'Check outcome',
    }))) });
    await db.$executeRawUnsafe('ANALYZE "Ticket"');
    await db.$executeRawUnsafe('ANALYZE "ActionTaken"');
    const cookies: string[] = [];
    for (const userId of [requesters[0], staff[1]]) {
      const material = createSessionMaterial(false);
      await db.authSession.create({ data: { userId, userVersion: 1, tokenHash: material.tokenHash, csrfToken: material.csrfToken, expiresAt: material.expiresAt } });
      cookies.push(`toktickit.sid=${material.token}`);
    }
    vi.resetModules(); vi.doMock('../../src/prisma.js', () => ({ default: db }));
    const { default: app } = await import('../../src/app.js');
    const observations = [];
    for (const [index, role] of ['requester', 'staff'].entries()) {
      queries.length = 0;
      const started = performance.now();
      const response = await request(app).get(`/api/dashboard/${role}`).set('Cookie', cookies[index]);
      const elapsedMs = performance.now() - started;
      const applicationQueries = [...queries];
      expect(response.status).toBe(200);
      expect(response.body.recentTickets).toHaveLength(5);
      expect(response.text).not.toContain('Private detail');
      expect(Buffer.byteLength(response.text)).toBeLessThan(5_000);
      // An intentionally generous local smoke guard, not a production latency SLA.
      expect(elapsedMs).toBeLessThan(5_000);
      const recordQueries = applicationQueries.filter(sql => /\bFROM\s+"[^"\n]+"\."(?:Ticket|ActionTaken)"/i.test(sql));
      expect(recordQueries).toHaveLength(index ? 6 : 5);
      expect(recordQueries.filter(sql => /\bLIMIT\b/.test(sql))).toHaveLength(1);
      expect(recordQueries.some(sql => sql.includes('description'))).toBe(false);
      const window = { gte: new Date(response.body.windowStart), lte: new Date(response.body.asOf) };
      if (!index) {
        const where = { requesterId: requesters[0] };
        expect(response.body.metrics).toEqual({
          open: await db.ticket.count({ where: { ...where, currentStatus: { in: [...open] } } }),
          waitingForRequester: await db.ticket.count({ where: { ...where, currentStatus: 'WAITING_FOR_REQUESTER' } }),
          recentlyUpdated: await db.ticket.count({ where: { ...where, updatedAt: window } }),
          recentlyResolved: await db.ticket.count({ where: { ...where, currentStatus: 'RESOLVED', updatedAt: window } }),
        });
      } else {
        expect(response.body.metrics.unassigned).toBe(await db.ticket.count({ where: { ownerId: null, currentStatus: { in: [...open] } } }));
        expect(response.body.metrics.myOwned).toBe(await db.ticket.count({ where: { ownerId: staff[1], currentStatus: { in: [...open] } } }));
        expect(response.body.metrics.myFollowUps).toBe(await db.actionTaken.count({ where: { assignedToId: staff[1], followUpRequired: true, status: { in: ['PLANNED', 'IN_PROGRESS'] }, ticket: { currentStatus: { in: [...open] } } } }));
        for (const currentStatus of statuses) expect(response.body.metrics.byStatus[currentStatus]).toBe(await db.ticket.count({ where: { currentStatus } }));
        for (const itPriority of ['LOW', 'MEDIUM', 'HIGH'] as const) expect(response.body.metrics.byPriority[itPriority]).toBe(await db.ticket.count({ where: { itPriority } }));
      }
      observations.push({ role, elapsedMs: Math.round(elapsedMs * 100) / 100, responseBytes: Buffer.byteLength(response.text), recentRows: response.body.recentTickets.length, dataQueries: recordQueries.length, metrics: response.body.metrics });
    }
    const plans: { label: string; plan: unknown }[] = [];
    const explain = async (label: string, sql: Prisma.Sql) => {
      const result = await db.$queryRaw<{ 'QUERY PLAN': unknown }[]>(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
      plans.push({ label, plan: result[0]['QUERY PLAN'] });
      return JSON.stringify(result);
    };
    // Natural planner choices: do not disable sequential scans or force indexes.
    expect(await explain('Requester open count', Prisma.sql`SELECT count(*) FROM "Ticket" WHERE "requesterId" = ${requesters[0]} AND "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`)).toContain('Index');
    await explain('Requester recent five', Prisma.sql`SELECT "id","summary","updatedAt" FROM "Ticket" WHERE "requesterId" = ${requesters[0]} AND "updatedAt" BETWEEN ${new Date(now.getTime() - 7 * 86400_000)} AND ${now} ORDER BY "updatedAt" DESC,"id" DESC LIMIT 5`);
    await explain('Staff owned open count', Prisma.sql`SELECT count(*) FROM "Ticket" WHERE "ownerId" = ${staff[1]} AND "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`);
    await explain('Staff status aggregate', Prisma.sql`SELECT "currentStatus",count(*) FROM "Ticket" GROUP BY "currentStatus"`);
    expect(await explain('Assigned unfinished follow-ups', Prisma.sql`SELECT count(*) FROM "ActionTaken" a JOIN "Ticket" t ON t.id=a."ticketId" WHERE a."assignedToId"=${staff[1]} AND a.status IN ('PLANNED','IN_PROGRESS') AND a."followUpRequired"=true AND t."currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`)).toContain('ActionTaken_assignedToId_status_idx');
    await explain('Staff recent five', Prisma.sql`SELECT "id","summary","updatedAt" FROM "Ticket" WHERE "updatedAt" BETWEEN ${new Date(now.getTime() - 7 * 86400_000)} AND ${now} ORDER BY "updatedAt" DESC,"id" DESC LIMIT 5`);
    mkdirSync(path.resolve('tmp'), { recursive: true });
    writeFileSync(path.resolve('tmp/dashboard-smoke.json'), JSON.stringify({ observedAt: new Date().toISOString(), baseline: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), result: 'PASS', fixture: { requesters: 100, staff: 20, tickets: 5_000, actions: 10_000 }, observations, plans, note: 'Local guarded-DB smoke, not a load benchmark. Representative parameterized query plans use natural planner settings. Full status aggregates and global recent sorting may correctly scan the fixture.' }, null, 2) + '\n');
  } finally {
    vi.doUnmock('../../src/prisma.js'); vi.resetModules();
    await db.$disconnect();
    if (!/^dashboard_smoke_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Unsafe smoke cleanup target');
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}, 120_000);
