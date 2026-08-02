import type { PrismaClient } from "@/generated/prisma/client";
import { LeadActivityType, SequenceEnrollmentStatus, SequenceStepRunStatus, SuppressionReason, WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { LeadServiceContext } from "@/lib/leads/service";
import type { CreateSuppressionInput } from "@/lib/suppressions/validation";
import { verifyUnsubscribeToken } from "@/lib/suppressions/token";

function assertManager(context: LeadServiceContext) {
  if (context.role !== WorkspaceRole.OWNER && context.role !== WorkspaceRole.ADMIN) throw new ApiError(403, "INSUFFICIENT_ROLE", "Only workspace owners and admins can manage suppressions.");
}

export async function suppressEmail(database: PrismaClient, input: { workspaceId: string; email: string; reason: SuppressionReason; details?: string | null; actorId?: string | null; leadId?: string | null }, now = new Date()) {
  const email = input.email.trim().toLowerCase();
  const existing = await database.suppressionEntry.findUnique({ where: { workspaceId_email: { workspaceId: input.workspaceId, email } } });
  if (existing?.reason === input.reason) return { entry: existing, cancelledEnrollments: 0, duplicate: true };
  const lead = input.leadId
    ? await database.lead.findFirst({ where: { id: input.leadId, workspaceId: input.workspaceId, email: { equals: email, mode: "insensitive" } } })
    : await database.lead.findFirst({ where: { workspaceId: input.workspaceId, email: { equals: email, mode: "insensitive" } } });
  const summary = input.reason === SuppressionReason.UNSUBSCRIBED ? "Lead unsubscribed from email." : input.reason === SuppressionReason.BOUNCED ? "Email address suppressed after a bounce." : input.reason === SuppressionReason.COMPLAINED ? "Email address suppressed after a complaint." : "Email address added to the suppression list.";
  const activityType = input.reason === SuppressionReason.UNSUBSCRIBED ? LeadActivityType.EMAIL_UNSUBSCRIBED : input.reason === SuppressionReason.BOUNCED ? LeadActivityType.EMAIL_BOUNCED : input.reason === SuppressionReason.COMPLAINED ? LeadActivityType.EMAIL_COMPLAINED : LeadActivityType.SUPPRESSION_CHANGED;
  return database.$transaction(async (tx) => {
    let cancelledEnrollments = 0;
    const entry = await tx.suppressionEntry.upsert({
      where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
      create: { workspaceId: input.workspaceId, email, reason: input.reason, details: input.details },
      update: { reason: input.reason, details: input.details },
    });
    if (lead) {
      const reason = `Email suppressed: ${input.reason.toLowerCase()}.`;
      const active = await tx.sequenceEnrollment.findMany({ where: { workspaceId: input.workspaceId, leadId: lead.id, status: { in: [SequenceEnrollmentStatus.PENDING, SequenceEnrollmentStatus.RUNNING, SequenceEnrollmentStatus.FAILED] } }, select: { id: true } });
      const ids = active.map((item) => item.id);
      cancelledEnrollments = ids.length;
      if (ids.length) {
        await tx.sequenceEnrollment.updateMany({ where: { id: { in: ids } }, data: { status: SequenceEnrollmentStatus.CANCELLED, error: reason, completedAt: now, nextRunAt: null } });
        await tx.sequenceStepRun.updateMany({ where: { enrollmentId: { in: ids }, status: { in: [SequenceStepRunStatus.PENDING, SequenceStepRunStatus.PROCESSING, SequenceStepRunStatus.FAILED] } }, data: { status: SequenceStepRunStatus.CANCELLED, error: reason, completedAt: now, lockToken: null, lockedAt: null } });
      }
      await tx.leadActivity.create({ data: { workspaceId: input.workspaceId, leadId: lead.id, actorId: input.actorId, type: activityType, summary, occurredAt: now, metadata: { reason: input.reason, details: input.details ?? null, cancelledEnrollments: ids.length } } });
      await tx.lead.update({ where: { id: lead.id }, data: { lastActivityAt: now } });
    }
    return { entry, cancelledEnrollments, duplicate: false };
  });
}

export async function listSuppressions(database: PrismaClient, context: LeadServiceContext) {
  return database.suppressionEntry.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { updatedAt: "desc" }, take: 200 });
}

export async function createSuppression(database: PrismaClient, context: LeadServiceContext, input: CreateSuppressionInput) {
  assertManager(context);
  return suppressEmail(database, { workspaceId: context.workspaceId, email: input.email, reason: input.reason, details: input.details, actorId: context.userId });
}

export async function removeSuppression(database: PrismaClient, context: LeadServiceContext, id: string) {
  assertManager(context);
  const entry = await database.suppressionEntry.findFirst({ where: { id, workspaceId: context.workspaceId } });
  if (!entry) throw new ApiError(404, "SUPPRESSION_NOT_FOUND", "Suppression entry was not found.");
  const lead = await database.lead.findFirst({ where: { workspaceId: context.workspaceId, email: { equals: entry.email, mode: "insensitive" } } });
  await database.$transaction(async (tx) => {
    await tx.suppressionEntry.delete({ where: { id: entry.id } });
    if (lead) await tx.leadActivity.create({ data: { workspaceId: context.workspaceId, leadId: lead.id, actorId: context.userId, type: LeadActivityType.SUPPRESSION_CHANGED, summary: "Email address removed from the suppression list.", metadata: { previousReason: entry.reason } } });
  });
  return { id: entry.id };
}

export async function getUnsubscribeStatus(database: PrismaClient, token: string) {
  const payload = verifyUnsubscribeToken(token);
  const lead = await database.lead.findFirst({ where: { id: payload.leadId, workspaceId: payload.workspaceId, email: { equals: payload.email, mode: "insensitive" } }, select: { id: true, email: true } });
  if (!lead) throw new ApiError(400, "INVALID_UNSUBSCRIBE_LINK", "This unsubscribe link no longer matches a contact.");
  const entry = await database.suppressionEntry.findUnique({ where: { workspaceId_email: { workspaceId: payload.workspaceId, email: payload.email } } });
  return { email: payload.email, unsubscribed: Boolean(entry), reason: entry?.reason ?? null };
}

export async function unsubscribeWithToken(database: PrismaClient, token: string) {
  const payload = verifyUnsubscribeToken(token);
  const lead = await database.lead.findFirst({ where: { id: payload.leadId, workspaceId: payload.workspaceId, email: { equals: payload.email, mode: "insensitive" } } });
  if (!lead) throw new ApiError(400, "INVALID_UNSUBSCRIBE_LINK", "This unsubscribe link no longer matches a contact.");
  const result = await suppressEmail(database, { workspaceId: payload.workspaceId, leadId: lead.id, email: payload.email, reason: SuppressionReason.UNSUBSCRIBED, details: "Recipient used the public unsubscribe page." });
  if (!result.duplicate) await database.emailEvent.create({ data: { workspaceId: payload.workspaceId, leadId: lead.id, type: "UNSUBSCRIBED", metadata: { source: "public_unsubscribe" } } });
  return { email: payload.email, unsubscribed: true, cancelledEnrollments: result.cancelledEnrollments };
}
