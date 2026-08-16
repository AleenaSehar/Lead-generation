import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { LeadRoutingMode, LeadRoutingRuleType, LeadSourceType, LeadStatus, WorkspaceRole } from "@/generated/prisma/enums";
import { createLead, type LeadServiceContext } from "@/lib/leads/service";
import { assignLead, createRoutingRule, getRoutingOverview, updateRoutingSettings } from "@/lib/routing/service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");
const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let member: LeadServiceContext;

beforeAll(async () => {
  const workspace = await database.workspace.create({ data: { name: "Routing test", slug: `routing-${runId}` } });
  const [ownerUser, memberUser, viewerUser] = await Promise.all([
    database.user.create({ data: { email: `routing-owner-${runId}@example.test`, name: "Owner" } }),
    database.user.create({ data: { email: `routing-member-${runId}@example.test`, name: "Member" } }),
    database.user.create({ data: { email: `routing-viewer-${runId}@example.test`, name: "Viewer" } }),
  ]);
  await database.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER },
    { workspaceId: workspace.id, userId: memberUser.id, role: WorkspaceRole.MEMBER },
    { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
  ] });
  owner = { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER };
  member = { workspaceId: workspace.id, userId: memberUser.id, role: WorkspaceRole.MEMBER };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { slug: { contains: runId } } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect(); await pool.end();
});

describe("lead routing and ownership", () => {
  it("lists eligible workspace members but excludes viewers", async () => {
    const overview = await getRoutingOverview(database, owner);
    expect(overview.members.map(({ role }) => role)).toEqual([WorkspaceRole.OWNER, WorkspaceRole.MEMBER]);
  });

  it("routes new leads round robin and records automatic assignment", async () => {
    await updateRoutingSettings(database, owner, { mode: LeadRoutingMode.ROUND_ROBIN });
    const first = await createLead(database, owner, { email: `first-${runId}@example.test`, status: LeadStatus.NEW, source: LeadSourceType.API, score: 0 });
    const second = await createLead(database, owner, { email: `second-${runId}@example.test`, status: LeadStatus.NEW, source: LeadSourceType.API, score: 0 });
    expect(first.ownerId).toBe(owner.userId);
    expect(second.ownerId).toBe(member.userId);
    const activity = await database.leadActivity.findFirst({ where: { leadId: second.id, type: "ASSIGNED" } });
    const notification = await database.notification.findFirst({ where: { leadId: second.id, recipientId: member.userId } });
    expect(activity?.summary).toContain("round-robin");
    expect(notification?.type).toBe("LEAD_ASSIGNED");
  });

  it("supports manual reassignment with an attributed audit event", async () => {
    const lead = await createLead(database, owner, { email: `manual-${runId}@example.test`, status: LeadStatus.NEW, source: LeadSourceType.MANUAL, score: 0 });
    const updated = await assignLead(database, owner, lead.id, { ownerId: member.userId });
    expect(updated.ownerId).toBe(member.userId);
    const activity = await database.leadActivity.findFirst({ where: { leadId: lead.id, type: "ASSIGNED" }, orderBy: { occurredAt: "desc" } });
    expect(activity?.summary).toContain("Member");
  });

  it("applies source and score rules before round robin", async () => {
    await createRoutingRule(database, owner, { name: "Website owner", type: LeadRoutingRuleType.SOURCE, ownerId: member.userId, source: LeadSourceType.WEBSITE, minScore: null });
    const lead = await createLead(database, owner, { email: `rule-${runId}@example.test`, status: LeadStatus.NEW, source: LeadSourceType.WEBSITE, score: 0 });
    expect(lead.ownerId).toBe(member.userId);
    const activity = await database.leadActivity.findFirst({ where: { leadId: lead.id, type: "ASSIGNED" } });
    expect(activity?.summary).toContain("Website owner");
  });

  it("prevents members from changing workspace routing mode", async () => {
    await expect(updateRoutingSettings(database, member, { mode: LeadRoutingMode.MANUAL })).rejects.toMatchObject({ status: 403 });
  });
});
