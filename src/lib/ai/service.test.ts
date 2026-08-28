import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { LeadActivityType, LeadSourceType, LeadStatus, WorkspaceRole } from "@/generated/prisma/enums";
import { normalizeApiError } from "@/lib/api/errors";
import { createLead, type LeadServiceContext } from "@/lib/leads/service";
import { generateLeadInsight } from "@/lib/ai/service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");

const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let viewer: LeadServiceContext;

beforeAll(async () => {
  const ownerUser = await database.user.create({ data: { email: `ai-insight-owner-${runId}@example.test` } });
  const viewerUser = await database.user.create({ data: { email: `ai-insight-viewer-${runId}@example.test` } });
  const workspace = await database.workspace.create({ data: { name: "AI insight workspace", slug: `ai-insight-${runId}` } });
  await database.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER },
      { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
    ],
  });
  owner = { userId: ownerUser.id, workspaceId: workspace.id, role: WorkspaceRole.OWNER };
  viewer = { userId: viewerUser.id, workspaceId: workspace.id, role: WorkspaceRole.VIEWER };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { slug: { contains: runId } } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect();
  await pool.end();
});

describe("generateLeadInsight (mock provider, no external calls)", () => {
  it("persists a schema-valid AI insight and logs an activity", async () => {
    const lead = await createLead(database, owner, {
      email: `insight-${runId}@example.test`,
      firstName: "Jordan",
      lastName: null,
      phone: null,
      jobTitle: "VP Sales",
      companyName: "Acme",
      companyDomain: "acme.test",
      status: LeadStatus.NEW,
      source: LeadSourceType.API,
      score: 60,
      consentSource: null,
    });

    const updated = await generateLeadInsight(database, owner, lead.id);
    expect(updated.aiInsightGeneratedAt).not.toBeNull();
    const insight = updated.aiInsight as { fitScore: number; summary: string; reasons: string[]; nextAction: string };
    expect(insight.fitScore).toBeGreaterThanOrEqual(0);
    expect(insight.fitScore).toBeLessThanOrEqual(100);
    expect(insight.reasons.length).toBeGreaterThan(0);

    const activity = await database.leadActivity.findFirst({ where: { leadId: lead.id, type: LeadActivityType.AI_INSIGHT_GENERATED } });
    expect(activity).not.toBeNull();
    expect((activity?.metadata as { provider?: string } | null)?.provider).toBe("mock");
  });

  it("rejects viewers who cannot update leads", async () => {
    const lead = await createLead(database, owner, {
      email: `insight-viewer-${runId}@example.test`,
      firstName: null, lastName: null, phone: null, jobTitle: null, companyName: null, companyDomain: null,
      status: LeadStatus.NEW, source: LeadSourceType.MANUAL, score: 0, consentSource: null,
    });

    try {
      await generateLeadInsight(database, viewer, lead.id);
      throw new Error("Expected viewer request to be rejected.");
    } catch (error) {
      const normalized = normalizeApiError(error);
      expect(normalized.status).toBe(403);
    }
  });

  it("returns 404 for a lead outside the workspace", async () => {
    try {
      await generateLeadInsight(database, owner, "not-a-real-lead-id");
      throw new Error("Expected missing lead to be rejected.");
    } catch (error) {
      const normalized = normalizeApiError(error);
      expect(normalized.status).toBe(404);
    }
  });
});
