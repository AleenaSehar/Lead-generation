import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { LeadSourceType, NotificationType, WorkspaceRole } from "@/generated/prisma/enums";
import type { LeadServiceContext } from "@/lib/leads/service";
import { createNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/service";

const connectionString = process.env.DATABASE_URL; if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");
const pool = new Pool({ connectionString }); const database = new PrismaClient({ adapter: new PrismaPg(pool) }); const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let workspaceId = ""; let leadId = ""; let first: LeadServiceContext; let second: LeadServiceContext; let outsider: LeadServiceContext;

beforeAll(async () => {
  const [workspace, otherWorkspace] = await Promise.all([database.workspace.create({ data: { name: "Notifications", slug: `notifications-${runId}` } }), database.workspace.create({ data: { name: "Other", slug: `notifications-other-${runId}` } })]);
  const users = await Promise.all(["first", "second", "outside"].map((name) => database.user.create({ data: { email: `notification-${name}-${runId}@example.test` } })));
  await database.workspaceMember.createMany({ data: [{ workspaceId: workspace.id, userId: users[0].id, role: WorkspaceRole.OWNER }, { workspaceId: workspace.id, userId: users[1].id, role: WorkspaceRole.MEMBER }, { workspaceId: otherWorkspace.id, userId: users[2].id, role: WorkspaceRole.OWNER }] });
  const lead = await database.lead.create({ data: { workspaceId: workspace.id, email: `lead-${runId}@example.test`, source: LeadSourceType.MANUAL } });
  workspaceId = workspace.id; leadId = lead.id; first = { workspaceId, userId: users[0].id, role: WorkspaceRole.OWNER }; second = { workspaceId, userId: users[1].id, role: WorkspaceRole.MEMBER }; outsider = { workspaceId: otherWorkspace.id, userId: users[2].id, role: WorkspaceRole.OWNER };
});

afterAll(async () => { await database.workspace.deleteMany({ where: { slug: { contains: runId } } }); await database.user.deleteMany({ where: { email: { contains: runId } } }); await database.$disconnect(); await pool.end(); });

describe("team notifications", () => {
  it("deduplicates workspace notifications and starts unread for every member", async () => {
    const input = { workspaceId, leadId, type: NotificationType.LEAD_QUALIFIED, title: "Lead qualified", message: "A lead qualified.", dedupeKey: `qualified-${runId}` };
    expect((await createNotification(database, input)).id).toBe((await createNotification(database, input)).id);
    expect(await database.notification.count({ where: { dedupeKey: input.dedupeKey } })).toBe(1);
    expect((await listNotifications(database, first)).unreadCount).toBe(1);
    expect((await listNotifications(database, second)).unreadCount).toBe(1);
  });

  it("keeps read state personal and enforces workspace isolation", async () => {
    const notification = (await listNotifications(database, first)).notifications[0];
    await markNotificationRead(database, first, notification.id);
    expect((await listNotifications(database, first)).unreadCount).toBe(0);
    expect((await listNotifications(database, second)).unreadCount).toBe(1);
    await expect(markNotificationRead(database, outsider, notification.id)).rejects.toMatchObject({ status: 404 });
  });

  it("marks all remaining notifications read for only the current user", async () => {
    await createNotification(database, { workspaceId, leadId, type: NotificationType.HIGH_SCORE, title: "High score", message: "Score 80", dedupeKey: `score-${runId}` });
    expect((await markAllNotificationsRead(database, second)).marked).toBe(2);
    expect((await listNotifications(database, second)).unreadCount).toBe(0);
    expect((await listNotifications(database, first)).unreadCount).toBe(1);
  });
});
