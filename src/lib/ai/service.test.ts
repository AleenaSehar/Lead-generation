import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { LeadActivityType, LeadSourceType, LeadStatus, WorkspaceRole } from "@/generated/prisma/enums";
import { generateLeadInsight } from "@/lib/ai/service";
import { createLead, type LeadServiceContext } from "@/lib/leads/service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");

const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let viewer: LeadServiceContext;
let otherOwner: LeadServiceContext;

async function createTestWorkspace(label: string) {
  const user = await database.user.create({
    data: { email: `ai-insight-${label}-${runId}@example.test`, name: `${label} user` },
  });
  const workspace = await database.workspace.create({
    data: { name: `${label} workspace`, slug: `ai-insight-${label}-${runId}` },
  });
  return { user, workspace };
}

beforeAll(async () => {
  const primary = await createTestWorkspace("primary");
  const other = await createTestWorkspace("other");
  const viewerUser = await database.user.create({
    data: { email: `ai-insight-viewer-${runId}@example.test` },
  });

  await database.workspaceMember.createMany({
    data: [
      { workspaceId: primary.workspace.id, userId: primary.user.id, role: WorkspaceRole.OWNER },
      { workspaceId: primary.workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
      { workspaceId: other.workspace.id, userId: other.user.id, role: WorkspaceRole.OWNER },
    ],
  });

  owner = { userId: primary.user.id, workspaceId: primary.workspace.id, role: WorkspaceRole.OWNER };
  viewer = { userId: viewerUser.id, workspaceId: primary.workspace.id, role: WorkspaceRole.VIEWER };
  otherOwner = { userId: other.user.id, workspaceId: other.workspace.id, role: WorkspaceRole.OWNER };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { slug: { contains: runId } } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect();
  await pool.end();
});

describe("AI lead insight service integration", () => {
  it("persists the insight and records an activity atomically", async () => {
    const lead = await createLead(database, owner, {
      email: `insight-${runId}@example.test`,
      status: LeadStatus.NEW,
      source: LeadSourceType.WEBSITE,
      score: 55,
    });

    const updated = await generateLeadInsight(database, owner, lead.id);
    expect(updated.aiInsight).toMatchObject({ fitScore: expect.any(Number), summary: expect.any(String) });
    expect(updated.aiInsightGeneratedAt).not.toBeNull();

    const activity = await database.leadActivity.findFirst({
      where: { leadId: lead.id, type: LeadActivityType.AI_INSIGHT_GENERATED },
    });
    expect(activity).not.toBeNull();
    expect(activity?.workspaceId).toBe(owner.workspaceId);
  });

  it("rejects a viewer role", async () => {
    const lead = await createLead(database, owner, {
      email: `insight-viewer-${runId}@example.test`,
      status: LeadStatus.NEW,
      source: LeadSourceType.WEBSITE,
      score: 10,
    });

    await expect(generateLeadInsight(database, viewer, lead.id)).rejects.toMatchObject({
      status: 403,
      code: "INSUFFICIENT_ROLE",
    });
  });

  it("returns 404 for a lead in another workspace", async () => {
    const lead = await createLead(database, owner, {
      email: `insight-cross-${runId}@example.test`,
      status: LeadStatus.NEW,
      source: LeadSourceType.WEBSITE,
      score: 10,
    });

    await expect(generateLeadInsight(database, otherOwner, lead.id)).rejects.toMatchObject({
      status: 404,
      code: "LEAD_NOT_FOUND",
    });
  });

  it("returns 404 for an unknown lead id", async () => {
    await expect(generateLeadInsight(database, owner, "unknown-lead-id")).rejects.toMatchObject({
      status: 404,
      code: "LEAD_NOT_FOUND",
    });
  });
});
