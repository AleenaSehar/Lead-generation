import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { EmailSequenceStatus, LeadStatus, SequenceEnrollmentStatus, SequenceStepRunStatus, WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import { getEmailProvider } from "@/lib/email/config";
import { sendLeadEmail } from "@/lib/email/service";
import type { LeadServiceContext } from "@/lib/leads/service";
import type { EnrollSequenceInput } from "@/lib/workflows/validation";

function assertManager(context: LeadServiceContext) {
  if (context.role !== WorkspaceRole.OWNER && context.role !== WorkspaceRole.ADMIN) throw new ApiError(403, "INSUFFICIENT_ROLE", "Only workspace owners and admins can manage sequence execution.");
}

async function eligibility(database: PrismaClient, workspaceId: string, leadId: string) {
  const lead = await database.lead.findFirst({ where: { id: leadId, workspaceId } });
  if (!lead) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  if (lead.status === LeadStatus.ARCHIVED) return { lead, reason: "Lead is archived." };
  if (!lead.email) return { lead, reason: "Lead has no email address." };
  if (!lead.consentAt) return { lead, reason: "Lead has no recorded consent." };
  const suppressed = await database.suppressionEntry.findUnique({ where: { workspaceId_email: { workspaceId, email: lead.email } } });
  return { lead, reason: suppressed ? `Email is suppressed because of ${suppressed.reason.toLowerCase()}.` : null };
}

export async function enrollLeadInSequence(database: PrismaClient, context: LeadServiceContext, input: EnrollSequenceInput, now = new Date()) {
  assertManager(context);
  const key = input.idempotencyKey ?? randomUUID();
  const existing = await database.sequenceEnrollment.findUnique({ where: { idempotencyKey: key }, include: { stepRuns: { orderBy: { position: "asc" } }, emailSequence: { select: { name: true } } } });
  if (existing) {
    if (existing.workspaceId !== context.workspaceId || existing.leadId !== input.leadId || existing.emailSequenceId !== input.emailSequenceId) throw new ApiError(409, "ENROLLMENT_IDEMPOTENCY_CONFLICT", "Enrollment idempotency key is already in use.");
    return { ...existing, duplicate: true };
  }
  const check = await eligibility(database, context.workspaceId, input.leadId);
  if (check.reason) throw new ApiError(409, "LEAD_NOT_ELIGIBLE", check.reason);
  const sequence = await database.emailSequence.findFirst({ where: { id: input.emailSequenceId, workspaceId: context.workspaceId, status: EmailSequenceStatus.DRAFT }, include: { steps: { orderBy: { position: "asc" } } } });
  if (!sequence) throw new ApiError(404, "SEQUENCE_NOT_FOUND", "Email sequence was not found.");
  if (!sequence.steps.length) throw new ApiError(409, "SEQUENCE_EMPTY", "Add at least one email step before enrolling leads.");
  const active = await database.sequenceEnrollment.findFirst({ where: { workspaceId: context.workspaceId, leadId: input.leadId, emailSequenceId: input.emailSequenceId, status: { in: [SequenceEnrollmentStatus.PENDING, SequenceEnrollmentStatus.RUNNING] } } });
  if (active) throw new ApiError(409, "ACTIVE_ENROLLMENT_EXISTS", "This lead already has an active enrollment in the sequence.");
  let scheduledAt = new Date(now);
  const snapshots = sequence.steps.map((step) => {
    scheduledAt = new Date(scheduledAt.getTime() + step.delayMinutes * 60_000);
    return { position: step.position, subject: step.subject, body: step.body, delayMinutes: step.delayMinutes, scheduledAt: new Date(scheduledAt), emailIdempotencyKey: `sequence-step:${key}:${step.position}` };
  });
  const created = await database.sequenceEnrollment.create({ data: { workspaceId: context.workspaceId, leadId: input.leadId, emailSequenceId: sequence.id, enrolledById: context.userId, idempotencyKey: key, nextRunAt: snapshots[0].scheduledAt, stepRuns: { create: snapshots } }, include: { stepRuns: { orderBy: { position: "asc" } }, emailSequence: { select: { name: true } } } });
  return { ...created, duplicate: false };
}

export async function listLeadEnrollments(database: PrismaClient, context: LeadServiceContext, leadId: string) {
  const lead = await database.lead.findFirst({ where: { id: leadId, workspaceId: context.workspaceId }, select: { id: true } });
  if (!lead) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  return database.sequenceEnrollment.findMany({ where: { leadId, workspaceId: context.workspaceId }, include: { emailSequence: { select: { name: true } }, stepRuns: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" }, take: 20 });
}

async function cancelForReason(database: PrismaClient, enrollmentId: string, reason: string, now: Date) {
  await database.$transaction([
    database.sequenceEnrollment.update({ where: { id: enrollmentId }, data: { status: SequenceEnrollmentStatus.CANCELLED, error: reason, completedAt: now, nextRunAt: null } }),
    database.sequenceStepRun.updateMany({ where: { enrollmentId, status: { in: [SequenceStepRunStatus.PENDING, SequenceStepRunStatus.PROCESSING] } }, data: { status: SequenceStepRunStatus.CANCELLED, error: reason, completedAt: now, lockToken: null, lockedAt: null } }),
  ]);
}

export async function processEnrollment(database: PrismaClient, context: LeadServiceContext, enrollmentId: string, now = new Date()) {
  assertManager(context);
  const enrollment = await database.sequenceEnrollment.findFirst({ where: { id: enrollmentId, workspaceId: context.workspaceId }, include: { stepRuns: { orderBy: { position: "asc" } } } });
  if (!enrollment) throw new ApiError(404, "ENROLLMENT_NOT_FOUND", "Sequence enrollment was not found.");
  if (enrollment.status === SequenceEnrollmentStatus.COMPLETED || enrollment.status === SequenceEnrollmentStatus.REPLIED || enrollment.status === SequenceEnrollmentStatus.CANCELLED) return { enrollment, outcome: enrollment.status.toLowerCase() };
  const check = await eligibility(database, context.workspaceId, enrollment.leadId);
  if (check.reason) { await cancelForReason(database, enrollment.id, check.reason, now); return { enrollment: await database.sequenceEnrollment.findUniqueOrThrow({ where: { id: enrollment.id }, include: { stepRuns: { orderBy: { position: "asc" } } } }), outcome: "cancelled" }; }

  let stepRuns = enrollment.stepRuns;
  if (enrollment.status === SequenceEnrollmentStatus.FAILED) {
    const failed = stepRuns.find((step) => step.status === SequenceStepRunStatus.FAILED);
    if (failed) {
      await database.$transaction([
        database.sequenceStepRun.update({ where: { id: failed.id }, data: { status: SequenceStepRunStatus.PENDING, error: null, completedAt: null } }),
        database.sequenceEnrollment.update({ where: { id: enrollment.id }, data: { status: SequenceEnrollmentStatus.RUNNING, error: null, nextRunAt: failed.scheduledAt } }),
      ]);
      stepRuns = stepRuns.map((step) => step.id === failed.id ? { ...step, status: SequenceStepRunStatus.PENDING, error: null, completedAt: null } : step);
    }
  }
  const candidate = stepRuns.find((step) => step.status === SequenceStepRunStatus.PENDING && step.scheduledAt <= now)
    ?? stepRuns.find((step) => step.status === SequenceStepRunStatus.PROCESSING && step.lockedAt && step.lockedAt <= new Date(now.getTime() - 5 * 60_000));
  if (!candidate) return { enrollment, outcome: "waiting", nextRunAt: enrollment.nextRunAt };
  const lockToken = randomUUID();
  const staleBefore = new Date(now.getTime() - 5 * 60_000);
  const claimed = await database.sequenceStepRun.updateMany({ where: { id: candidate.id, OR: [{ status: SequenceStepRunStatus.PENDING, scheduledAt: { lte: now } }, { status: SequenceStepRunStatus.PROCESSING, lockedAt: { lte: staleBefore } }] }, data: { status: SequenceStepRunStatus.PROCESSING, lockToken, lockedAt: now, startedAt: candidate.startedAt ?? now, attempts: { increment: 1 }, error: null } });
  if (!claimed.count) return { enrollment, outcome: "already_claimed" };
  await database.sequenceEnrollment.update({ where: { id: enrollment.id }, data: { status: SequenceEnrollmentStatus.RUNNING, startedAt: enrollment.startedAt ?? now } });
  try {
    const sent = await sendLeadEmail(database, getEmailProvider(), context, { leadId: enrollment.leadId, subject: candidate.subject, text: candidate.body }, { idempotencyKey: candidate.emailIdempotencyKey });
    await database.sequenceStepRun.updateMany({ where: { id: candidate.id, lockToken }, data: { status: SequenceStepRunStatus.COMPLETED, completedAt: now, providerMessageId: sent.providerMessageId, lockToken: null, lockedAt: null } });
    const next = await database.sequenceStepRun.findFirst({ where: { enrollmentId: enrollment.id, status: SequenceStepRunStatus.PENDING }, orderBy: { position: "asc" } });
    const finalStatus = next ? SequenceEnrollmentStatus.RUNNING : SequenceEnrollmentStatus.COMPLETED;
    const updated = await database.sequenceEnrollment.update({ where: { id: enrollment.id }, data: { status: finalStatus, nextRunAt: next?.scheduledAt ?? null, ...(next ? {} : { completedAt: now }) }, include: { stepRuns: { orderBy: { position: "asc" } }, emailSequence: { select: { name: true } } } });
    return { enrollment: updated, outcome: next ? "step_completed" : "completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Step processing failed.";
    await database.$transaction([
      database.sequenceStepRun.updateMany({ where: { id: candidate.id, lockToken }, data: { status: SequenceStepRunStatus.FAILED, error: message, completedAt: now, lockToken: null, lockedAt: null } }),
      database.sequenceEnrollment.update({ where: { id: enrollment.id }, data: { status: SequenceEnrollmentStatus.FAILED, error: message, nextRunAt: null } }),
    ]);
    throw error;
  }
}

export async function cancelEnrollment(database: PrismaClient, context: LeadServiceContext, enrollmentId: string, now = new Date()) {
  assertManager(context);
  const enrollment = await database.sequenceEnrollment.findFirst({ where: { id: enrollmentId, workspaceId: context.workspaceId } });
  if (!enrollment) throw new ApiError(404, "ENROLLMENT_NOT_FOUND", "Sequence enrollment was not found.");
  if (enrollment.status !== SequenceEnrollmentStatus.COMPLETED && enrollment.status !== SequenceEnrollmentStatus.REPLIED) await cancelForReason(database, enrollment.id, "Cancelled manually.", now);
  return database.sequenceEnrollment.findUniqueOrThrow({ where: { id: enrollment.id }, include: { stepRuns: { orderBy: { position: "asc" } }, emailSequence: { select: { name: true } } } });
}
