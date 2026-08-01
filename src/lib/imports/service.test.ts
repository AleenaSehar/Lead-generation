import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { WorkspaceRole } from "@/generated/prisma/enums";
import type { LeadServiceContext } from "@/lib/leads/service";
import { importCsvLeads } from "./service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for integration tests.");
const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let viewer: LeadServiceContext;

beforeAll(async () => {
  const workspace = await database.workspace.create({ data: { name: "Import tests", slug: `import-${runId}` } });
  const ownerUser = await database.user.create({ data: { email: `import-owner-${runId}@example.test` } });
  const viewerUser = await database.user.create({ data: { email: `import-viewer-${runId}@example.test` } });
  await database.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER },
    { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
  ] });
  owner = { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER };
  viewer = { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { slug: { contains: runId } } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect();
  await pool.end();
});

describe("CSV lead import", () => {
  it("imports valid rows, reports invalid rows, and handles duplicates", async () => {
    const email = `csv-${runId}@example.test`;
    const first = await importCsvLeads(database, owner, {
      rows: [{ Email: email, First: "Maya", Score: "75" }, { Email: "not-an-email", First: "Bad" }],
      mapping: { email: "Email", firstName: "First", score: "Score" },
      duplicateStrategy: "SKIP",
    });
    expect(first).toMatchObject({ created: 1, failed: 1 });
    expect((await database.lead.findFirst({ where: { workspaceId: owner.workspaceId, email } }))?.source).toBe("CSV_IMPORT");

    const updated = await importCsvLeads(database, owner, {
      rows: [{ Email: email, First: "Updated" }],
      mapping: { email: "Email", firstName: "First" },
      duplicateStrategy: "UPDATE",
    });
    expect(updated.updated).toBe(1);
    expect((await database.lead.findFirst({ where: { workspaceId: owner.workspaceId, email } }))?.firstName).toBe("Updated");
  });

  it("blocks viewers", async () => {
    await expect(importCsvLeads(database, viewer, {
      rows: [{ Email: `blocked-${runId}@example.test` }],
      mapping: { email: "Email" },
      duplicateStrategy: "SKIP",
    })).rejects.toMatchObject({ status: 403 });
  });
});
