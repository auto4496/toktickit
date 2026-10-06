BEGIN;
CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ActionOperation" AS ENUM ('CREATED', 'EDITED', 'STARTED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "ActionTaken" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "assignedToId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "performedById" TEXT NOT NULL,
  "actionAt" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "result" TEXT NOT NULL DEFAULT '',
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpNote" TEXT NOT NULL DEFAULT '',
  "attachmentNotes" TEXT NOT NULL DEFAULT '',
  "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ActionRevision" (
  "id" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "operation" "ActionOperation" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionRevision_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ActionCreateRequest" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionCreateRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActionTaken_ticketId_actionAt_id_idx" ON "ActionTaken"("ticketId", "actionAt", "id");
CREATE INDEX "ActionTaken_ticketId_status_idx" ON "ActionTaken"("ticketId", "status");
CREATE INDEX "ActionTaken_assignedToId_status_idx" ON "ActionTaken"("assignedToId", "status");
CREATE INDEX "ActionRevision_actionId_createdAt_id_idx" ON "ActionRevision"("actionId", "createdAt", "id");
CREATE UNIQUE INDEX "ActionCreateRequest_actionId_key" ON "ActionCreateRequest"("actionId");
CREATE UNIQUE INDEX "ActionCreateRequest_actorId_idempotencyKey_key" ON "ActionCreateRequest"("actorId", "idempotencyKey");

ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionRevision" ADD CONSTRAINT "ActionRevision_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionRevision" ADD CONSTRAINT "ActionRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionCreateRequest" ADD CONSTRAINT "ActionCreateRequest_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionCreateRequest" ADD CONSTRAINT "ActionCreateRequest_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
