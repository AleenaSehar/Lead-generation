import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { LeadSourceType, LeadStatus, SequenceEnrollmentStatus, SequenceStepRunStatus, SuppressionReason, WorkspaceRole } from "@/generated/prisma/enums";
import type { LeadServiceContext } from "@/lib/leads/service";
import { createSuppression, getUnsubscribeStatus, removeSuppression, unsubscribeWithToken } from "@/lib/suppressions/service";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/suppressions/token";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");
const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let viewer: LeadServiceContext;
let workspaceId: string;

beforeAll(async () => {
  const workspace = await database.workspace.create({ data: { name: "Suppression test", slug: `suppression-${runId}` } });
  const [ownerUser, viewerUser] = await Promise.all([
    database.user.create({ data: { email: `suppression-owner-${runId}@example.test` } }),
    database.user.create({ data: { email: `suppression-viewer-${runId}@example.test` } }),
  ]);
  await database.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER },
    { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
  ] });
  workspaceId = workspace.id;
  owner = { workspaceId, userId: ownerUser.id, role: WorkspaceRole.OWNER };
  viewer = { workspaceId, userId: viewerUser.id, role: WorkspaceRole.VIEWER };
});

afterAll(async () => {
  await database.workspace.deleteMany({ where: { id: workspaceId } });
  await database.user.deleteMany({ where: { email: { contains: runId } } });
  await database.$disconnect(); await pool.end();
});

async function createLead(label: string) {
  return database.lead.create({ data: { workspaceId, email: `${label}-${runId}@example.test`, consentAt: new Date(), status: LeadStatus.NEW, source: LeadSourceType.MANUAL } });
}

describe("email safety controls", () => {
  it("creates a manual suppression, cancels active work, and records activity", async () => {
    const lead = await createLead("manual");
    const sequence = await database.emailSequence.create({ data: { workspaceId, name: `Safety ${runId}`, steps: { create: { position: 0, subject: "Hello", body: "Test", delayMinutes: 10 } } } });
    const enrollment = await database.sequenceEnrollment.create({ data: { workspaceId, leadId: lead.id, emailSequenceId: sequence.id, enrolledById: owner.userId, idempotencyKey: `safety-${runId}`, stepRuns: { create: { position: 0, subject: "Hello", body: "Test", delayMinutes: 10, scheduledAt: new Date(), emailIdempotencyKey: `safety-step-${runId}` } } } });
    const result = await createSuppression(database, owner, { email: lead.email!, reason: SuppressionReason.MANUAL, details: "Requested by sales" });
    expect(result.cancelledEnrollments).toBe(1);
    expect((await database.sequenceEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).status).toBe(SequenceEnrollmentStatus.CANCELLED);
    expect((await database.sequenceStepRun.findFirstOrThrow({ where: { enrollmentId: enrollment.id } })).status).toBe(SequenceStepRunStatus.CANCELLED);
    expect(await database.leadActivity.findFirst({ where: { leadId: lead.id, type: "SUPPRESSION_CHANGED" } })).not.toBeNull();
    await expect(createSuppression(database, viewer, { email: `blocked-${runId}@example.test`, reason: SuppressionReason.MANUAL })).rejects.toMatchObject({ status: 403 });
  });

  it("uses a tamper-resistant public token and makes unsubscribe idempotent", async () => {
    const lead = await createLead("unsubscribe");
    const token = createUnsubscribeToken({ workspaceId, leadId: lead.id, email: lead.email! });
    expect(verifyUnsubscribeToken(token)).toMatchObject({ workspaceId, leadId: lead.id, email: lead.email });
    expect(() => verifyUnsubscribeToken(`${token}changed`)).toThrow();
    expect((await getUnsubscribeStatus(database, token)).unsubscribed).toBe(false);
    expect((await unsubscribeWithToken(database, token)).unsubscribed).toBe(true);
    expect((await unsubscribeWithToken(database, token)).unsubscribed).toBe(true);
    expect(await database.emailEvent.count({ where: { leadId: lead.id, type: "UNSUBSCRIBED" } })).toBe(1);
    expect((await getUnsubscribeStatus(database, token)).reason).toBe(SuppressionReason.UNSUBSCRIBED);
  });

  it("allows only a manager to remove a suppression without restoring consent", async () => {
    const lead = await createLead("remove");
    const result = await createSuppression(database, owner, { email: lead.email!, reason: SuppressionReason.LEGAL_REQUEST });
    await expect(removeSuppression(database, viewer, result.entry.id)).rejects.toMatchObject({ status: 403 });
    await removeSuppression(database, owner, result.entry.id);
    expect(await database.suppressionEntry.findUnique({ where: { id: result.entry.id } })).toBeNull();
    expect((await database.lead.findUniqueOrThrow({ where: { id: lead.id } })).consentAt).not.toBeNull();
  });
});
