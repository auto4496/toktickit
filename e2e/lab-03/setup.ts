import { createRequire } from 'node:module';
import path from 'node:path';
import { prepareE2eEnvironment } from '../lab-02/database';
import { hashPassword } from '../../server/src/auth/password';
import { e2ePassword } from '../lab-02/helpers';
import { requireTestDatabaseUrl } from '../../server/tests/test-database';
export default async function setup() {
  await prepareE2eEnvironment();
  const require = createRequire(path.resolve('server/package.json'));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: requireTestDatabaseUrl({ testDatabaseUrl: process.env.TEST_DATABASE_URL, developmentDatabaseUrl: process.env.DATABASE_URL }) } } });
  try {
    const passwordHash = await hashPassword(e2ePassword);
    for (const [id, name, email, role] of [
      ['99999999-9999-4999-8999-999999999996', 'Alex Morgan', 'e2e.staff@example.test', 'IT_STAFF'],
      ['99999999-9999-4999-8999-999999999997', 'Taylor Admin', 'e2e.admin@example.test', 'ADMINISTRATOR'],
    ]) await prisma.user.upsert({ where: { id }, create: { id, name, email, role, passwordHash, mustChangePassword: false }, update: { passwordHash, mustChangePassword: false, isActive: true } });
  } finally { await prisma.$disconnect(); }
}
