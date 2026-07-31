import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { WorkspaceRole } from "@/generated/prisma/enums";
import type { LeadServiceContext } from "@/lib/leads/service";
import {
  createCaptureForm,
  getPublicForm,
  submitPublicForm,
  updateCaptureForm,
} from "./service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for integration tests.");
const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let viewer: LeadServiceContext;

beforeAll(async () => {
  const workspace = await database.workspace.create({
    data: { name: "Capture tests", slug: `capture-tests-${runId}` },
  });
  const ownerUser = await database.user.create({
    data: { email: `capture-owner-${runId}@example.test` },
  });
  const viewerUser = await database.user.create({
    data: { email: `capture-viewer-${runId}@example.test` },
  });
  await database.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER },
      { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
    ],
  });
  owner = { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER };
  viewer = { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { slug: { contains: runId } } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect();
  await pool.end();
});

describe("capture form service", () => {
  it("restricts form management to owners and admins", async () => {
    await expect(
      createCaptureForm(database, viewer, {
        name: "Blocked",
        title: "Blocked",
        status: "ACTIVE",
        successMessage: "Thanks!",
        collectFirstName: true,
        collectLastName: true,
        collectCompanyName: true,
        collectJobTitle: false,
        collectCompanyDomain: false,
        collectPhone: false,
        collectMessage: true,
        requireConsent: true,
        consentText: "I agree to receive a response.",
      }),
    ).rejects.toMatchObject({ status: 403, code: "INSUFFICIENT_ROLE" });
  });

  it("creates a lead and audit records from a public submission", async () => {
    const form = await createCaptureForm(database, owner, {
      name: "Website demo",
      title: "Book a demo",
      status: "ACTIVE",
      successMessage: "We received your request.",
      collectFirstName: true,
      collectLastName: true,
      collectCompanyName: true,
      collectJobTitle: false,
      collectCompanyDomain: false,
      collectPhone: false,
      collectMessage: true,
      requireConsent: true,
      consentText: "I agree to receive a response.",
    });
    await submitPublicForm(
      database,
      form.publicId,
      { email: `prospect-${runId}@example.test`, firstName: "Maya", consent: true },
      { ip: "192.0.2.10", userAgent: "Vitest" },
    );
    const lead = await database.lead.findUnique({
      where: {
        workspaceId_email: {
          workspaceId: owner.workspaceId,
          email: `prospect-${runId}@example.test`,
        },
      },
      include: { captureSubmissions: true, activities: true },
    });
    expect(lead?.captureSubmissions).toHaveLength(1);
    expect(lead?.activities.some((activity) => activity.type === "FORM_SUBMITTED")).toBe(true);

    await submitPublicForm(
      database,
      form.publicId,
      { email: `prospect-${runId}@example.test`, companyName: "Updated Co", consent: true },
      { ip: "192.0.2.11", userAgent: "Vitest" },
    );
    expect(
      await database.lead.count({
        where: { workspaceId: owner.workspaceId, email: `prospect-${runId}@example.test` },
      }),
    ).toBe(1);
  });

  it("makes inactive forms unavailable", async () => {
    const form = await createCaptureForm(database, owner, {
      name: "Paused",
      title: "Paused form",
      status: "ACTIVE",
      successMessage: "Thanks!",
      collectFirstName: true,
      collectLastName: true,
      collectCompanyName: true,
      collectJobTitle: false,
      collectCompanyDomain: false,
      collectPhone: false,
      collectMessage: true,
      requireConsent: true,
      consentText: "I agree to receive a response.",
    });
    await updateCaptureForm(database, owner, form.id, { status: "INACTIVE" });
    await expect(getPublicForm(database, form.publicId)).rejects.toMatchObject({ status: 404 });
  });
});
