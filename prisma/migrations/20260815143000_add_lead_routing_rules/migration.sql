CREATE TYPE "LeadRoutingRuleType" AS ENUM ('SOURCE', 'MIN_SCORE');

CREATE TABLE "LeadRoutingRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "LeadRoutingRuleType" NOT NULL,
  "source" "LeadSourceType",
  "minScore" INTEGER,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "LeadRoutingRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadRoutingRule_workspaceId_isActive_position_idx" ON "LeadRoutingRule"("workspaceId", "isActive", "position");
CREATE INDEX "LeadRoutingRule_ownerId_idx" ON "LeadRoutingRule"("ownerId");
ALTER TABLE "LeadRoutingRule" ADD CONSTRAINT "LeadRoutingRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadRoutingRule" ADD CONSTRAINT "LeadRoutingRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
