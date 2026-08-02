import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { WorkspaceRole } from "@/generated/prisma/enums";
import type { LeadServiceContext } from "@/lib/leads/service";
import { archiveEmailSequence, createEmailSequence, listEmailSequences, updateEmailSequence } from "@/lib/sequences/service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");
const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let viewer: LeadServiceContext;
let otherOwner: LeadServiceContext;
const workspaceIds: string[] = [];

async function context(label: string, role: WorkspaceRole) {
  const workspace = await database.workspace.create({ data: { name: label, slug: `sequence-${label}-${runId}` } });
  const user = await database.user.create({ data: { email: `sequence-${label}-${runId}@example.test` } });
  await database.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role } });
  workspaceIds.push(workspace.id);
  return { workspaceId: workspace.id, userId: user.id, role };
}

beforeAll(async () => {
  owner = await context("primary", WorkspaceRole.OWNER);
  otherOwner = await context("other", WorkspaceRole.OWNER);
  const viewerUser = await database.user.create({ data: { email: `sequence-viewer-${runId}@example.test` } });
  await database.workspaceMember.create({ data: { workspaceId: owner.workspaceId, userId: viewerUser.id, role: WorkspaceRole.VIEWER } });
  viewer = { workspaceId: owner.workspaceId, userId: viewerUser.id, role: WorkspaceRole.VIEWER };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect(); await pool.end();
});

describe("email sequence drafts", () => {
  it("creates and atomically reorders steps", async () => {
    const sequence = await createEmailSequence(database, owner, { name: "Inbound follow-up", description: "Draft", steps: [
      { subject: "First", body: "Hello", delayMinutes: 0 },
      { subject: "Second", body: "Following up", delayMinutes: 1440 },
    ] });
    expect(sequence.steps.map((step) => step.position)).toEqual([0, 1]);
    const updated = await updateEmailSequence(database, owner, sequence.id, { steps: [
      { subject: "Second", body: "Following up", delayMinutes: 60 },
      { subject: "First", body: "Hello", delayMinutes: 0 },
    ] });
    expect(updated.steps.map((step) => step.subject)).toEqual(["Second", "First"]);
    expect(updated.steps.map((step) => step.position)).toEqual([0, 1]);
  });

  it("allows read-only listing but blocks viewer mutations", async () => {
    expect((await listEmailSequences(database, viewer)).length).toBeGreaterThan(0);
    await expect(createEmailSequence(database, viewer, { name: "Blocked", steps: [] })).rejects.toMatchObject({ status: 403 });
  });

  it("isolates workspaces and archives without deleting", async () => {
    const sequence = (await listEmailSequences(database, owner))[0];
    await expect(updateEmailSequence(database, otherOwner, sequence.id, { name: "Cross workspace" })).rejects.toMatchObject({ status: 404 });
    await archiveEmailSequence(database, owner, sequence.id);
    expect((await listEmailSequences(database, owner)).map((item) => item.id)).not.toContain(sequence.id);
    expect(await database.emailSequence.findUnique({ where: { id: sequence.id } })).not.toBeNull();
  });
});
