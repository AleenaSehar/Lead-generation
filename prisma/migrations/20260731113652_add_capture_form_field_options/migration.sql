-- AlterTable
ALTER TABLE "CaptureForm" ADD COLUMN     "collectCompanyDomain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collectJobTitle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collectMessage" BOOLEAN NOT NULL DEFAULT true;
