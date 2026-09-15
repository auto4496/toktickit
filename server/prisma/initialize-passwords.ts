import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { hashPassword, passwordValidationError } from '../src/auth/password.js';

export const INITIAL_PASSWORD_REQUIRED = '!INITIAL_PASSWORD_REQUIRED';
export async function initializePasswords(client: PrismaClient, values: unknown) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Provide a JSON object mapping user IDs to initial passwords.');
  const map = values as Record<string, unknown>;
  const pending = await client.user.findMany({ where: { passwordHash: INITIAL_PASSWORD_REQUIRED }, select: { id: true } });
  for (const user of pending) if (passwordValidationError(map[user.id])) throw new Error(`Missing or invalid initial password for user ${user.id}. No accounts were changed.`);
  const prepared = [];
  for (const user of pending) prepared.push({ id: user.id, hash: await hashPassword(map[user.id] as string) });
  return client.$transaction(async (tx) => {
    let count = 0;
    for (const user of prepared) {
      const result = await tx.user.updateMany({ where: { id: user.id, passwordHash: INITIAL_PASSWORD_REQUIRED }, data: { passwordHash: user.hash, mustChangePassword: true, version: { increment: 1 } } });
      count += result.count;
    }
    return count;
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Pass the path to an ignored local initial-password JSON file.');
  const client = new PrismaClient();
  try {
    const count = await initializePasswords(client, JSON.parse(await readFile(file, 'utf8')));
    console.log(`Initialized ${count} accounts. Passwords are never printed.`);
  } finally { await client.$disconnect(); }
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/initialize-passwords.ts')) {
  main().catch(() => { console.error('Initial-password setup failed. Check the private input map and database; no passwords are logged.'); process.exitCode = 1; });
}
