import { Prisma } from '@prisma/client';

export const resolutionReady = (unfinished: number, completedWithResult: number) => unfinished === 0 && completedWithResult > 0;

// Match JavaScript trim whitespace, including NBSP and BOM, without returning Action text.
const nonblankResult = '[^\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]';
export async function getResolutionGate(tx: Prisma.TransactionClient, ticketId: string) {
  const [counts] = await tx.$queryRaw<Array<{ unfinished: number; completedWithResult: number }>>`
    SELECT count(*) FILTER (WHERE "status" IN ('PLANNED', 'IN_PROGRESS'))::int AS "unfinished",
      count(*) FILTER (WHERE "status" = 'COMPLETED' AND "result" ~ ${nonblankResult})::int AS "completedWithResult"
    FROM "ActionTaken" WHERE "ticketId" = ${ticketId}`;
  return { ...counts, ready: resolutionReady(counts.unfinished, counts.completedWithResult) };
}
