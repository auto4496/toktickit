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

const testDatabaseUrl = () => requireTestDatabaseUrl({
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  developmentDatabaseUrl: process.env.DATABASE_URL,
});

const clearE2eData = async (prisma: PrismaClientInstance) => {
  await prisma.attachment.deleteMany();
  await prisma.ticketCreateRequest.deleteMany();
  await prisma.ticket.deleteMany();
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
