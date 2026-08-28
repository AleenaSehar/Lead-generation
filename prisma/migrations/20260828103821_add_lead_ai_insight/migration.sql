-- AlterEnum
ALTER TYPE "LeadActivityType" ADD VALUE 'AI_INSIGHT_GENERATED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "aiInsight" JSONB,
ADD COLUMN     "aiInsightGeneratedAt" TIMESTAMP(3);
