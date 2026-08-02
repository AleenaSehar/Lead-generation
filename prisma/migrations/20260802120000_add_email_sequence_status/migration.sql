CREATE TYPE "EmailSequenceStatus" AS ENUM ('DRAFT', 'ARCHIVED');
ALTER TABLE "EmailSequence" ADD COLUMN "status" "EmailSequenceStatus" NOT NULL DEFAULT 'DRAFT';
DROP INDEX "EmailSequence_workspaceId_idx";
CREATE INDEX "EmailSequence_workspaceId_status_idx" ON "EmailSequence"("workspaceId", "status");
