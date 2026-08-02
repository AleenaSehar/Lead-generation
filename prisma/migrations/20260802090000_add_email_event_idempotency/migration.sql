ALTER TABLE "EmailEvent" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mock';
ALTER TABLE "EmailEvent" ADD COLUMN "providerEventId" TEXT;
CREATE UNIQUE INDEX "EmailEvent_providerEventId_key" ON "EmailEvent"("providerEventId");
CREATE INDEX "EmailEvent_workspaceId_providerMessageId_occurredAt_idx" ON "EmailEvent"("workspaceId", "providerMessageId", "occurredAt");
