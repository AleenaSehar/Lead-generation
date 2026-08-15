import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { LeadActivityType, LeadSourceType, MeetingStatus, NotificationType, WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { LeadServiceContext } from "@/lib/leads/service";
import { createNotification } from "@/lib/notifications/service";
import type { Availability, BookingPageInput, PublicBookingInput } from "@/lib/bookings/validation";

export const defaultAvailability: Availability = { "0": [], "1": [{ start: "09:00", end: "17:00" }], "2": [{ start: "09:00", end: "17:00" }], "3": [{ start: "09:00", end: "17:00" }], "4": [{ start: "09:00", end: "17:00" }], "5": [{ start: "09:00", end: "17:00" }], "6": [] };

function assertManager(context: LeadServiceContext) {
  if (context.role !== WorkspaceRole.OWNER && context.role !== WorkspaceRole.ADMIN) throw new ApiError(403, "INSUFFICIENT_ROLE", "Only workspace owners and admins can configure booking.");
}

function zonedDate(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number); const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(target);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(candidate).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    candidate = new Date(candidate.getTime() + target - represented);
  }
  return candidate;
}

function localDay(date: string) { return new Date(`${date}T12:00:00Z`).getUTCDay().toString() as keyof Availability; }
function minutes(value: string) { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
function time(minutesValue: number) { return `${String(Math.floor(minutesValue / 60)).padStart(2, "0")}:${String(minutesValue % 60).padStart(2, "0")}`; }
function dateInZone(value: Date, timeZone: string) { const parts = Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])); return `${parts.year}-${parts.month}-${parts.day}`; }

export async function getBookingPage(database: PrismaClient, context: LeadServiceContext) {
  return database.bookingPage.findUnique({ where: { workspaceId: context.workspaceId }, include: { _count: { select: { meetings: true } } } });
}

export async function saveBookingPage(database: PrismaClient, context: LeadServiceContext, input: BookingPageInput) {
  assertManager(context);
  return database.bookingPage.upsert({ where: { workspaceId: context.workspaceId }, create: { ...input, availability: input.availability, workspaceId: context.workspaceId, createdById: context.userId }, update: { ...input, availability: input.availability } });
}

export async function getPublicBookingPage(database: PrismaClient, publicId: string) {
  const page = await database.bookingPage.findFirst({ where: { publicId, isActive: true }, select: { publicId: true, title: true, description: true, durationMinutes: true, bufferMinutes: true, minimumNoticeHours: true, maximumAdvanceDays: true, timeZone: true, availability: true, workspace: { select: { name: true } } } });
  if (!page) throw new ApiError(404, "BOOKING_PAGE_NOT_FOUND", "Booking page was not found.");
  return page;
}

export async function listAvailableSlots(database: PrismaClient, publicId: string, date: string, now = new Date()) {
  const page = await getPublicBookingPage(database, publicId);
  const availability = page.availability as Availability;
  const windows = availability[localDay(date)] ?? [];
  const dayStart = zonedDate(date, "00:00", page.timeZone); const dayEnd = new Date(dayStart.getTime() + 36 * 60 * 60_000);
  const meetings = await database.meeting.findMany({ where: { bookingPage: { publicId }, status: MeetingStatus.BOOKED, startAt: { lt: dayEnd }, endAt: { gt: dayStart } }, select: { startAt: true, endAt: true } });
  const earliest = now.getTime() + page.minimumNoticeHours * 60 * 60_000;
  const latest = now.getTime() + page.maximumAdvanceDays * 24 * 60 * 60_000;
  const slots: string[] = [];
  for (const window of windows) for (let cursor = minutes(window.start); cursor + page.durationMinutes <= minutes(window.end); cursor += page.durationMinutes + page.bufferMinutes) {
    const start = zonedDate(date, time(cursor), page.timeZone); const end = new Date(start.getTime() + page.durationMinutes * 60_000);
    const blocked = meetings.some((meeting) => meeting.startAt.getTime() < end.getTime() + page.bufferMinutes * 60_000 && meeting.endAt.getTime() + page.bufferMinutes * 60_000 > start.getTime());
    if (!blocked && start.getTime() >= earliest && start.getTime() <= latest) slots.push(start.toISOString());
  }
  return { page, date, slots };
}

export async function createPublicBooking(database: PrismaClient, publicId: string, input: PublicBookingInput, now = new Date()) {
  const page = await getPublicBookingPage(database, publicId);
  const requested = new Date(input.startAt);
  const date = dateInZone(requested, page.timeZone);
  const available = await listAvailableSlots(database, publicId, date, now);
  if (!available.slots.includes(requested.toISOString())) throw new ApiError(409, "BOOKING_SLOT_UNAVAILABLE", "That time is no longer available. Choose another slot.");
  const endAt = new Date(requested.getTime() + page.durationMinutes * 60_000);
  try {
    return await database.$transaction(async (tx) => {
      const existingLead = await tx.lead.findUnique({ where: { workspaceId_email: { workspaceId: (await tx.bookingPage.findUniqueOrThrow({ where: { publicId } })).workspaceId, email: input.attendeeEmail } } });
      const bookingPage = await tx.bookingPage.findUniqueOrThrow({ where: { publicId } });
      const lead = existingLead ?? await tx.lead.create({ data: { workspaceId: bookingPage.workspaceId, email: input.attendeeEmail, firstName: input.attendeeName, source: LeadSourceType.WEBSITE, status: "NEW" } });
      const meeting = await tx.meeting.create({ data: { workspaceId: bookingPage.workspaceId, bookingPageId: bookingPage.id, leadId: lead.id, startAt: requested, endAt, attendeeName: input.attendeeName, attendeeEmail: input.attendeeEmail, attendeeTimeZone: input.attendeeTimeZone, notes: input.notes } });
      await tx.leadActivity.create({ data: { workspaceId: bookingPage.workspaceId, leadId: lead.id, type: LeadActivityType.MEETING_BOOKED, summary: `Meeting booked for ${requested.toISOString()}.`, occurredAt: now, metadata: { meetingId: meeting.id, startAt: requested.toISOString(), endAt: endAt.toISOString(), attendeeTimeZone: input.attendeeTimeZone } } });
      await createNotification(tx, { workspaceId: bookingPage.workspaceId, leadId: lead.id, type: NotificationType.MEETING_BOOKED, title: "Meeting booked", message: `${input.attendeeName} booked ${bookingPage.title}.`, dedupeKey: `meeting-booked:${meeting.id}`, metadata: { meetingId: meeting.id, startAt: requested.toISOString() } });
      await tx.lead.update({ where: { id: lead.id }, data: { lastActivityAt: now } });
      return meeting;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) throw new ApiError(409, "BOOKING_SLOT_UNAVAILABLE", "That time was just booked. Choose another slot.");
    throw error;
  }
}

export async function listMeetings(database: PrismaClient, context: LeadServiceContext) {
  return database.meeting.findMany({ where: { workspaceId: context.workspaceId, status: MeetingStatus.BOOKED, startAt: { gte: new Date() } }, include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, companyName: true } }, bookingPage: { select: { title: true } } }, orderBy: { startAt: "asc" }, take: 100 });
}
