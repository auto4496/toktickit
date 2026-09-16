import { Prisma } from '@prisma/client';

// User administration must take this same lock before changing role/activity,
// then lock ticket rows. Keep this ordering for all owner-sensitive operations.
export async function lockAccounts(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(334, 3)`;
}
