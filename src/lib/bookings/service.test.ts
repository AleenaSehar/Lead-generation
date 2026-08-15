import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { createPublicBooking, defaultAvailability, getPublicBookingPage, listAvailableSlots, saveBookingPage } from "@/lib/bookings/service";
import type { LeadServiceContext } from "@/lib/leads/service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");
const pool = new Pool({ connectionString }); const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`; let workspaceId = ""; let owner: LeadServiceContext; let viewer: LeadServiceContext;
const input = { title: "Book a demo", description: "Meet the team", durationMinutes: 30, bufferMinutes: 0, minimumNoticeHours: 0, maximumAdvanceDays: 60, timeZone: "UTC", availability: defaultAvailability, isActive: true };

beforeAll(async () => { const workspace = await database.workspace.create({ data: { name: "Booking test", slug: `booking-${runId}` } }); const [ownerUser, viewerUser] = await Promise.all([database.user.create({ data: { email: `booking-owner-${runId}@example.test` } }), database.user.create({ data: { email: `booking-viewer-${runId}@example.test` } })]); await database.workspaceMember.createMany({ data: [{ workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER }, { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER }] }); workspaceId = workspace.id; owner = { workspaceId, userId: ownerUser.id, role: WorkspaceRole.OWNER }; viewer = { workspaceId, userId: viewerUser.id, role: WorkspaceRole.VIEWER }; });
afterAll(async () => { await database.workspace.deleteMany({ where: { id: workspaceId } }); await database.user.deleteMany({ where: { email: { contains: runId } } }); await database.$disconnect(); await pool.end(); });

describe("calendar booking", () => {
  it("lets managers publish a page and blocks viewers", async () => { const page = await saveBookingPage(database, owner, input); expect((await getPublicBookingPage(database, page.publicId)).title).toBe("Book a demo"); await expect(saveBookingPage(database, viewer, input)).rejects.toMatchObject({ status: 403 }); });
  it("generates availability and removes a booked slot", async () => { const page = await database.bookingPage.findUniqueOrThrow({ where: { workspaceId } }); const now = new Date("2026-08-03T08:00:00.000Z"); const available = await listAvailableSlots(database, page.publicId, "2026-08-03", now); expect(available.slots[0]).toBe("2026-08-03T09:00:00.000Z"); const booking = await createPublicBooking(database, page.publicId, { startAt: available.slots[0], attendeeName: "Maya Chen", attendeeEmail: `maya-${runId}@example.test`, attendeeTimeZone: "Asia/Karachi", notes: "Product demo" }, now); expect(booking.startAt.toISOString()).toBe(available.slots[0]); expect((await listAvailableSlots(database, page.publicId, "2026-08-03", now)).slots).not.toContain(available.slots[0]); expect(await database.leadActivity.findFirst({ where: { leadId: booking.leadId, type: "MEETING_BOOKED" } })).not.toBeNull(); expect(await database.notification.findFirst({ where: { leadId: booking.leadId, type: "MEETING_BOOKED" } })).not.toBeNull(); });
  it("rejects a stale or duplicate slot", async () => { const page = await database.bookingPage.findUniqueOrThrow({ where: { workspaceId } }); const now = new Date("2026-08-03T08:00:00.000Z"); await expect(createPublicBooking(database, page.publicId, { startAt: "2026-08-03T09:00:00.000Z", attendeeName: "Other Person", attendeeEmail: `other-${runId}@example.test`, attendeeTimeZone: "UTC" }, now)).rejects.toMatchObject({ code: "BOOKING_SLOT_UNAVAILABLE" }); });
});
