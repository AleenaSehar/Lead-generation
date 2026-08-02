CREATE TYPE "MeetingStatus" AS ENUM ('BOOKED', 'CANCELLED');

CREATE TABLE "BookingPage" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Book a meeting',
  "description" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
  "minimumNoticeHours" INTEGER NOT NULL DEFAULT 2,
  "maximumAdvanceDays" INTEGER NOT NULL DEFAULT 30,
  "timeZone" TEXT NOT NULL DEFAULT 'UTC',
  "availability" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "createdById" TEXT,
  CONSTRAINT "BookingPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Meeting" (
  "id" TEXT NOT NULL,
  "status" "MeetingStatus" NOT NULL DEFAULT 'BOOKED',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "attendeeName" TEXT NOT NULL,
  "attendeeEmail" TEXT NOT NULL,
  "attendeeTimeZone" TEXT NOT NULL,
  "notes" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "bookingPageId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingPage_publicId_key" ON "BookingPage"("publicId");
CREATE UNIQUE INDEX "BookingPage_workspaceId_key" ON "BookingPage"("workspaceId");
CREATE INDEX "BookingPage_createdById_idx" ON "BookingPage"("createdById");
CREATE UNIQUE INDEX "Meeting_bookingPageId_startAt_key" ON "Meeting"("bookingPageId", "startAt");
CREATE INDEX "Meeting_workspaceId_startAt_idx" ON "Meeting"("workspaceId", "startAt");
CREATE INDEX "Meeting_leadId_startAt_idx" ON "Meeting"("leadId", "startAt");
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
