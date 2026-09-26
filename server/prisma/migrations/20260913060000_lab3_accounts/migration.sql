BEGIN;
-- Stop instead of merging identities whose normalized email would collide.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "RequesterUser" GROUP BY lower(trim("email")) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Lab 3 migration stopped: normalized requester email collision. Resolve duplicate identities before retrying.';
  END IF;
END $$;

ALTER TABLE "RequesterUser" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
ALTER TABLE "User"
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'REQUESTER',
  ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '!INITIAL_PASSWORD_REQUIRED',
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
UPDATE "User" SET "email" = lower(trim("email"));
-- The sentinel can never verify as a password. Initialization is an explicit,
-- resumable local command, not a shared initial credential embedded in SQL.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;

ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';
UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;
ALTER TABLE "Ticket"
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "requesterResolvedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Ticket_currentStatus_updatedAt_idx" ON "Ticket"("currentStatus", "updatedAt");
CREATE INDEX "Ticket_ownerId_updatedAt_idx" ON "Ticket"("ownerId", "updatedAt");
CREATE INDEX "Ticket_itPriority_updatedAt_idx" ON "Ticket"("itPriority", "updatedAt");

CREATE TABLE "AuthSession" (
  "id" TEXT PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "csrfToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "userVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE TABLE "PublicComment" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "InternalNote" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PublicComment_ticketId_createdAt_id_idx" ON "PublicComment"("ticketId", "createdAt", "id");
CREATE INDEX "InternalNote_ticketId_createdAt_id_idx" ON "InternalNote"("ticketId", "createdAt", "id");
COMMIT;
