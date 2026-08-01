-- CreateEnum
CREATE TYPE "CaptureFormStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CaptureForm" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "successMessage" TEXT NOT NULL DEFAULT 'Thanks! We will be in touch soon.',
    "status" "CaptureFormStatus" NOT NULL DEFAULT 'ACTIVE',
    "collectFirstName" BOOLEAN NOT NULL DEFAULT true,
    "collectLastName" BOOLEAN NOT NULL DEFAULT true,
    "collectCompanyName" BOOLEAN NOT NULL DEFAULT true,
    "collectPhone" BOOLEAN NOT NULL DEFAULT false,
    "requireConsent" BOOLEAN NOT NULL DEFAULT true,
    "consentText" TEXT NOT NULL DEFAULT 'I agree to be contacted about this request.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "CaptureForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureSubmission" (
    "id" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "formId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT,

    CONSTRAINT "CaptureSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaptureForm_publicId_key" ON "CaptureForm"("publicId");

-- CreateIndex
CREATE INDEX "CaptureForm_workspaceId_status_idx" ON "CaptureForm"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "CaptureForm_createdById_idx" ON "CaptureForm"("createdById");

-- CreateIndex
CREATE INDEX "CaptureSubmission_formId_submittedAt_idx" ON "CaptureSubmission"("formId", "submittedAt");

-- CreateIndex
CREATE INDEX "CaptureSubmission_formId_ipHash_submittedAt_idx" ON "CaptureSubmission"("formId", "ipHash", "submittedAt");

-- CreateIndex
CREATE INDEX "CaptureSubmission_workspaceId_submittedAt_idx" ON "CaptureSubmission"("workspaceId", "submittedAt");

-- CreateIndex
CREATE INDEX "CaptureSubmission_leadId_idx" ON "CaptureSubmission"("leadId");

-- AddForeignKey
ALTER TABLE "CaptureForm" ADD CONSTRAINT "CaptureForm_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureForm" ADD CONSTRAINT "CaptureForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSubmission" ADD CONSTRAINT "CaptureSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "CaptureForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSubmission" ADD CONSTRAINT "CaptureSubmission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSubmission" ADD CONSTRAINT "CaptureSubmission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
