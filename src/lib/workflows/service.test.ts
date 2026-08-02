import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { EmailEventType, LeadSourceType, LeadStatus, SequenceEnrollmentStatus, SequenceStepRunStatus, WorkspaceRole } from "@/generated/prisma/enums";
import type { LeadServiceContext } from "@/lib/leads/service";
import { cancelEnrollment, enrollLeadInSequence, listLeadEnrollments, processEnrollment } from "@/lib/workflows/service";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for database integration tests.");
const pool = new Pool({ connectionString });
const database = new PrismaClient({ adapter: new PrismaPg(pool) });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let owner: LeadServiceContext;
let viewer: LeadServiceContext;
let workspaceId: string;
let sequenceId: string;

beforeAll(async () => {
  const workspace = await database.workspace.create({ data: { name: "Workflow test", slug: `workflow-${runId}` } });
  const [ownerUser, viewerUser] = await Promise.all([
    database.user.create({ data: { email: `workflow-owner-${runId}@example.test` } }),
    database.user.create({ data: { email: `workflow-viewer-${runId}@example.test` } }),
  ]);
  await database.workspaceMember.createMany({ data: [
    { workspaceId: workspace.id, userId: ownerUser.id, role: WorkspaceRole.OWNER },
    { workspaceId: workspace.id, userId: viewerUser.id, role: WorkspaceRole.VIEWER },
  ] });
  const sequence = await database.emailSequence.create({ data: { workspaceId: workspace.id, name: "Two-step draft", steps: { create: [
    { position: 0, subject: "First", body: "First message", delayMinutes: 0 },
    { position: 1, subject: "Second", body: "Second message", delayMinutes: 60 },
  ] } } });
  workspaceId = workspace.id; sequenceId = sequence.id;
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

describe("sequence workflow execution", () => {
  it("snapshots steps and makes enrollment requests idempotent", async () => {
    const lead = await createLead("enroll");
    const input = { leadId: lead.id, emailSequenceId: sequenceId, idempotencyKey: `enrollment-${runId}` };
    const enrollment = await enrollLeadInSequence(database, owner, input, new Date("2026-08-02T10:00:00.000Z"));
    expect(enrollment.stepRuns.map((step) => step.scheduledAt.toISOString())).toEqual(["2026-08-02T10:00:00.000Z", "2026-08-02T11:00:00.000Z"]);
    expect((await enrollLeadInSequence(database, owner, input)).duplicate).toBe(true);
    await expect(enrollLeadInSequence(database, viewer, { ...input, idempotencyKey: `viewer-${runId}` })).rejects.toMatchObject({ status: 403 });
  });

  it("claims a due step once across concurrent processor calls", async () => {
    const lead = await createLead("concurrent");
    const now = new Date("2026-08-02T12:00:00.000Z");
    const enrollment = await enrollLeadInSequence(database, owner, { leadId: lead.id, emailSequenceId: sequenceId, idempotencyKey: `concurrent-${runId}` }, now);
    const results = await Promise.all([processEnrollment(database, owner, enrollment.id, now), processEnrollment(database, owner, enrollment.id, now)]);
    expect(results.map((result) => result.outcome)).toEqual(expect.arrayContaining(["step_completed", "already_claimed"]));
    const first = await database.sequenceStepRun.findFirstOrThrow({ where: { enrollmentId: enrollment.id, position: 0 } });
    expect(first).toMatchObject({ status: SequenceStepRunStatus.COMPLETED, attempts: 1 });
    expect(await database.emailEvent.count({ where: { leadId: lead.id, type: EmailEventType.QUEUED } })).toBe(1);
    expect((await processEnrollment(database, owner, enrollment.id, new Date("2026-08-02T13:01:00.000Z"))).outcome).toBe("completed");
    expect((await database.sequenceEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).status).toBe(SequenceEnrollmentStatus.COMPLETED);
  });

  it("cancels remaining work when consent is removed", async () => {
    const lead = await createLead("consent-removed");
    const now = new Date("2026-08-02T14:00:00.000Z");
    const enrollment = await enrollLeadInSequence(database, owner, { leadId: lead.id, emailSequenceId: sequenceId, idempotencyKey: `cancel-${runId}` }, now);
    await database.lead.update({ where: { id: lead.id }, data: { consentAt: null } });
    expect((await processEnrollment(database, owner, enrollment.id, now)).outcome).toBe("cancelled");
    const saved = await database.sequenceEnrollment.findUniqueOrThrow({ where: { id: enrollment.id }, include: { stepRuns: true } });
    expect(saved.status).toBe(SequenceEnrollmentStatus.CANCELLED);
    expect(saved.stepRuns.every((step) => step.status === SequenceStepRunStatus.CANCELLED)).toBe(true);
    expect(await database.emailEvent.count({ where: { leadId: lead.id } })).toBe(0);
  });

  it("retries a failed step with its stable email idempotency key", async () => {
    const lead = await createLead("retry");
    const now = new Date("2026-08-02T15:00:00.000Z");
    const enrollment = await enrollLeadInSequence(database, owner, { leadId: lead.id, emailSequenceId: sequenceId, idempotencyKey: `retry-${runId}` }, now);
    const first = enrollment.stepRuns[0];
    await database.$transaction([
      database.sequenceStepRun.update({ where: { id: first.id }, data: { status: SequenceStepRunStatus.FAILED, error: "Temporary provider error" } }),
      database.sequenceEnrollment.update({ where: { id: enrollment.id }, data: { status: SequenceEnrollmentStatus.FAILED, error: "Temporary provider error" } }),
    ]);
    expect((await processEnrollment(database, owner, enrollment.id, now)).outcome).toBe("step_completed");
    const retried = await database.sequenceStepRun.findUniqueOrThrow({ where: { id: first.id } });
    expect(retried).toMatchObject({ status: SequenceStepRunStatus.COMPLETED, attempts: 1, error: null });
    expect(await database.emailEvent.count({ where: { idempotencyKey: first.emailIdempotencyKey } })).toBe(1);
  });

  it("lists workspace lead history and supports manual cancellation", async () => {
    const lead = await createLead("manual-cancel");
    const enrollment = await enrollLeadInSequence(database, owner, { leadId: lead.id, emailSequenceId: sequenceId, idempotencyKey: `manual-${runId}` });
    expect((await listLeadEnrollments(database, viewer, lead.id))[0].id).toBe(enrollment.id);
    expect((await cancelEnrollment(database, owner, enrollment.id)).status).toBe(SequenceEnrollmentStatus.CANCELLED);
  });
});
