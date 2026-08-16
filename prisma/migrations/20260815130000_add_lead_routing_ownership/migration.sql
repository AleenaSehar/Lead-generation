CREATE TYPE "LeadRoutingMode" AS ENUM ('MANUAL', 'ROUND_ROBIN');

ALTER TYPE "NotificationType" ADD VALUE 'LEAD_ASSIGNED';

ALTER TABLE "Workspace"
ADD COLUMN "routingMode" "LeadRoutingMode" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "routingCursor" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Notification" ADD COLUMN "recipientId" TEXT;

CREATE INDEX "Notification_recipientId_createdAt_idx"
ON "Notification"("recipientId", "createdAt");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
