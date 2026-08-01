CREATE TYPE "ScoringRuleField" AS ENUM ('SOURCE', 'STATUS', 'JOB_TITLE', 'COMPANY_NAME', 'COMPANY_DOMAIN', 'EMAIL', 'PHONE', 'CONSENT');
CREATE TYPE "ScoringRuleOperator" AS ENUM ('EQUALS', 'CONTAINS', 'EXISTS', 'NOT_EXISTS');

CREATE TABLE "ScoringRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "field" "ScoringRuleField" NOT NULL,
    "operator" "ScoringRuleOperator" NOT NULL,
    "value" TEXT,
    "points" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    CONSTRAINT "ScoringRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScoringRule_workspaceId_isActive_position_idx" ON "ScoringRule"("workspaceId", "isActive", "position");
ALTER TABLE "ScoringRule" ADD CONSTRAINT "ScoringRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
