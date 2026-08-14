ALTER TYPE "SequenceEnrollmentStatus" ADD VALUE 'REPLIED';
ALTER TABLE "LeadActivity" ADD COLUMN "sourceKey" TEXT;
CREATE UNIQUE INDEX "LeadActivity_sourceKey_key" ON "LeadActivity"("sourceKey");
