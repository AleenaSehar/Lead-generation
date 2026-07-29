import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import {
  LeadActivityType,
  LeadSourceType,
  LeadStatus,
  WorkspaceRole,
} from "@/generated/prisma/enums";
import { ApiError, normalizeApiError } from "@/lib/api/errors";
import {
  archiveLead,
  createLead,
  getLead,
  listLeads,
  updateLead,
  type LeadServiceContext,
} from "./service";
import { leadListQuerySchema } from "./validation";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");

const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let member: LeadServiceContext;
let viewer: LeadServiceContext;
let otherOwner: LeadServiceContext;

async function createTestWorkspace(label: string) {
  const user = await database.user.create({
    data: { email: `lead-api-${label}-${runId}@example.test`, name: `${label} user` },
  });
  const workspace = await database.workspace.create({
    data: { name: `${label} workspace`, slug: `lead-api-${label}-${runId}` },
  });
  return { user, workspace };
}

beforeAll(async () => {
  const primary = await createTestWorkspace("primary");
  const other = await createTestWorkspace("other");
  const memberUser = await database.user.create({
    data: { email: `lead-api-member-${runId}@example.test` },
  });
  const viewerUser = await database.user.create({
    data: { email: `lead-api-viewer-${runId}@example.test` },
  });

  await database.workspaceMember.createMany({
    data: [
      { workspaceId: primary.workspace.id, userId: primary.user.id, role: WorkspaceRole.OWNER },
      { workspaceId: primary.workspace.id, userId: memberUser.id, role: WorkspaceRole.MEMBER },
      { workspaceId: primary.workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
      { workspaceId: other.workspace.id, userId: other.user.id, role: WorkspaceRole.OWNER },
    ],
  });

  owner = { userId: primary.user.id, workspaceId: primary.workspace.id, role: WorkspaceRole.OWNER };
  member = { userId: memberUser.id, workspaceId: primary.workspace.id, role: WorkspaceRole.MEMBER };
  viewer = { userId: viewerUser.id, workspaceId: primary.workspace.id, role: WorkspaceRole.VIEWER };
  otherOwner = {
    userId: other.user.id,
    workspaceId: other.workspace.id,
    role: WorkspaceRole.OWNER,
  };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { slug: { contains: runId } } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect();
  await pool.end();
});

describe("lead service integration", () => {
  it("creates a workspace-scoped lead and its activity atomically", async () => {
    const lead = await createLead(database, owner, {
      email: `alex-${runId}@example.test`,
      firstName: "Alex",
      lastName: null,
      phone: null,
      jobTitle: null,
      companyName: "Acme",
      companyDomain: null,
      status: LeadStatus.NEW,
      source: LeadSourceType.API,
      score: 45,
      consentSource: null,
    });

    const saved = await getLead(database, owner, lead.id);
    expect(saved.workspaceId).toBe(owner.workspaceId);
    expect(saved.activities).toHaveLength(1);
    expect(saved.activities[0].type).toBe(LeadActivityType.CREATED);
  });

  it("rejects duplicate emails within a workspace", async () => {
    const email = `duplicate-${runId}@example.test`;
    const input = {
      email,
      status: LeadStatus.NEW,
      source: LeadSourceType.MANUAL,
      score: 0,
    };
    await createLead(database, owner, input);

    try {
      await createLead(database, owner, input);
      throw new Error("Expected duplicate creation to fail.");
    } catch (error) {
      const normalized = normalizeApiError(error);
      expect(normalized.status).toBe(409);
      expect(normalized.code).toBe("DUPLICATE_LEAD");
    }
  });

  it("enforces workspace boundaries and role permissions", async () => {
    const lead = await createLead(database, member, {
      email: `member-${runId}@example.test`,
      status: LeadStatus.NEW,
      source: LeadSourceType.MANUAL,
      score: 10,
    });

    await expect(getLead(database, otherOwner, lead.id)).rejects.toMatchObject({
      status: 404,
      code: "LEAD_NOT_FOUND",
    });
    await expect(
      createLead(database, viewer, {
        email: `viewer-${runId}@example.test`,
        status: LeadStatus.NEW,
        source: LeadSourceType.MANUAL,
        score: 0,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(archiveLead(database, member, lead.id)).rejects.toMatchObject({
      status: 403,
      code: "INSUFFICIENT_ROLE",
    });
  });

  it("tracks changes, filters lists, and archives without deleting", async () => {
    const lead = await createLead(database, owner, {
      email: `search-${runId}@example.test`,
      firstName: "Needle",
      companyName: "Searchable Labs",
      status: LeadStatus.NEW,
      source: LeadSourceType.WEBSITE,
      score: 20,
    });
    await updateLead(database, member, lead.id, { status: LeadStatus.QUALIFIED, score: 88 });

    const result = await listLeads(
      database,
      viewer,
      leadListQuerySchema.parse({ search: "Searchable", status: "QUALIFIED", minScore: "80" }),
    );
    expect(result.data.map((item) => item.id)).toContain(lead.id);

    const detailed = await getLead(database, owner, lead.id);
    expect(detailed.activities.map((activity) => activity.type)).toEqual(
      expect.arrayContaining([
        LeadActivityType.CREATED,
        LeadActivityType.UPDATED,
        LeadActivityType.STATUS_CHANGED,
        LeadActivityType.SCORE_CHANGED,
      ]),
    );

    await archiveLead(database, owner, lead.id);
    const defaultList = await listLeads(database, owner, leadListQuerySchema.parse({}));
    expect(defaultList.data.map((item) => item.id)).not.toContain(lead.id);
    expect((await getLead(database, owner, lead.id)).status).toBe(LeadStatus.ARCHIVED);
  });
});
