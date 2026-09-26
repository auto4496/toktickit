import { hashPassword } from '../../server/src/auth/password.js';
import { requesterA, requesterB, e2ePassword } from './helpers.js';
import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { seedDatabase } from '../../server/prisma/seed-data.js';
import { requireTestDatabaseUrl } from '../../server/tests/test-database.js';

const root = process.cwd();
const storageDirectory = path.join(root, 'tmp', 'attachments', 'e2e');
const serverRequire = createRequire(path.join(root, 'server', 'package.json'));
const { PrismaClient } = serverRequire('@prisma/client') as typeof import('@prisma/client');
type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const e2eTicketFilter = {
  OR: [
    { summary: { startsWith: '[E2E-' } },
    { summary: { startsWith: '[RESP-' } },
    { summary: { startsWith: '[VIS-' } },
  ],
} as const;

const testDatabaseUrl = () => requireTestDatabaseUrl({
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  developmentDatabaseUrl: process.env.DATABASE_URL,
});

const clearE2eData = async (prisma: PrismaClientInstance) => {
  const tickets = await prisma.ticket.findMany({
    where: e2eTicketFilter,
    select: { id: true },
  });
  const ticketIds = tickets.map(({ id }) => id);
  if (ticketIds.length === 0) return;

  await prisma.$transaction([
    prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } }),
    prisma.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } }),
    prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } }),
    prisma.ticketCreateRequest.deleteMany({ where: { ticketId: { in: ticketIds } } }),
    prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } }),
  ]);
};

export async function prepareE2eEnvironment() {
  const databaseUrl = testDatabaseUrl();
  const prismaExecutable = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(
    process.execPath,
    [prismaExecutable, 'migrate', 'deploy', '--schema=server/prisma/schema.prisma'],
    { cwd: root, env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'inherit' },
  );

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await clearE2eData(prisma);
    await seedDatabase(prisma);
    const passwordHash = await hashPassword(e2ePassword);
    for (const user of [requesterA, requesterB]) {
      await prisma.authSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.upsert({ where: { id: user.id }, update: { passwordHash, mustChangePassword: false }, create: { ...user, passwordHash, mustChangePassword: false } });
    }
    const initialId = '99999999-9999-4999-8999-999999999995';
    await prisma.authSession.deleteMany({ where: { userId: initialId } });
    await prisma.user.upsert({ where: { id: initialId }, update: { passwordHash, mustChangePassword: true }, create: {
      id: initialId, name: 'Initial Staff E2E', email: 'e2e.initial@example.test', role: 'IT_STAFF', passwordHash, mustChangePassword: true,
    } });
  } finally {
    await prisma.$disconnect();
  }
  await rm(storageDirectory, { recursive: true, force: true });
}

export async function cleanE2eEnvironment() {
  const databaseUrl = testDatabaseUrl();
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await clearE2eData(prisma);
  } finally {
    await prisma.$disconnect();
  }
  await rm(storageDirectory, { recursive: true, force: true });
}
