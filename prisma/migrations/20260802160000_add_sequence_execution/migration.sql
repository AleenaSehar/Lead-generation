CREATE TYPE "SequenceEnrollmentStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "SequenceStepRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
ALTER TABLE "EmailEvent" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "EmailEvent_idempotencyKey_key" ON "EmailEvent"("idempotencyKey");

CREATE TABLE "SequenceEnrollment" (
  "id" TEXT NOT NULL,
  "status" "SequenceEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "nextRunAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "emailSequenceId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "enrolledById" TEXT NOT NULL,
  CONSTRAINT "SequenceEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SequenceStepRun" (
  "id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "delayMinutes" INTEGER NOT NULL,
  "status" "SequenceStepRunStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "lockToken" TEXT,
  "lockedAt" TIMESTAMP(3),
  "emailIdempotencyKey" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  CONSTRAINT "SequenceStepRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SequenceEnrollment_idempotencyKey_key" ON "SequenceEnrollment"("idempotencyKey");
CREATE INDEX "SequenceEnrollment_workspaceId_status_nextRunAt_idx" ON "SequenceEnrollment"("workspaceId", "status", "nextRunAt");
CREATE INDEX "SequenceEnrollment_leadId_createdAt_idx" ON "SequenceEnrollment"("leadId", "createdAt");
CREATE INDEX "SequenceEnrollment_emailSequenceId_createdAt_idx" ON "SequenceEnrollment"("emailSequenceId", "createdAt");
CREATE UNIQUE INDEX "SequenceStepRun_emailIdempotencyKey_key" ON "SequenceStepRun"("emailIdempotencyKey");
CREATE UNIQUE INDEX "SequenceStepRun_enrollmentId_position_key" ON "SequenceStepRun"("enrollmentId", "position");
CREATE INDEX "SequenceStepRun_status_scheduledAt_idx" ON "SequenceStepRun"("status", "scheduledAt");
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_emailSequenceId_fkey" FOREIGN KEY ("emailSequenceId") REFERENCES "EmailSequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SequenceStepRun" ADD CONSTRAINT "SequenceStepRun_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SequenceEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
