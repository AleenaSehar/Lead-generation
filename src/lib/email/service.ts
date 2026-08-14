import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { EmailEventType, LeadActivityType, SequenceEnrollmentStatus, SequenceStepRunStatus, SuppressionReason } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import { getEmailFrom } from "@/lib/email/config";
import type { EmailProvider } from "@/lib/email/provider";
import type { EmailWebhookInput, SendEmailInput } from "@/lib/email/validation";
import { assertLeadPermission } from "@/lib/leads/permissions";
import type { LeadServiceContext } from "@/lib/leads/service";
import { suppressEmail } from "@/lib/suppressions/service";
import { createUnsubscribeUrl } from "@/lib/suppressions/token";

export async function sendLeadEmail(database: PrismaClient, provider: EmailProvider, context: LeadServiceContext, input: SendEmailInput, options: { idempotencyKey?: string } = {}) {
  assertLeadPermission(context.role, "update");
  const lead = await database.lead.findFirst({ where: { id: input.leadId, workspaceId: context.workspaceId } });
  if (!lead) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  if (!lead.email) throw new ApiError(409, "LEAD_EMAIL_REQUIRED", "This lead does not have an email address.");
  if (!lead.consentAt) throw new ApiError(409, "EMAIL_CONSENT_REQUIRED", "Recorded consent is required before email can be queued.");
  const suppression = await database.suppressionEntry.findUnique({ where: { workspaceId_email: { workspaceId: context.workspaceId, email: lead.email } } });
  if (suppression) throw new ApiError(409, "EMAIL_SUPPRESSED", `Email is suppressed because of ${suppression.reason.toLowerCase()}.`);

  const existing = options.idempotencyKey ? await database.emailEvent.findUnique({ where: { idempotencyKey: options.idempotencyKey } }) : null;
  if (existing && (existing.workspaceId !== context.workspaceId || existing.leadId !== lead.id)) throw new ApiError(409, "EMAIL_IDEMPOTENCY_CONFLICT", "Email idempotency key is already in use.");
  if (existing?.providerMessageId) return { queuedEventId: existing.id, provider: existing.provider, providerMessageId: existing.providerMessageId, status: EmailEventType.SENT, simulated: existing.provider === "mock", duplicate: true };
  const queued = existing ?? await database.emailEvent.create({
    data: { workspaceId: context.workspaceId, leadId: lead.id, type: EmailEventType.QUEUED, provider: provider.name, idempotencyKey: options.idempotencyKey, metadata: { recipient: lead.email, from: getEmailFrom(), subject: input.subject } },
  });
  try {
    const unsubscribeUrl = createUnsubscribeUrl({ workspaceId: context.workspaceId, leadId: lead.id, email: lead.email });
    const text = `${input.text}\n\nUnsubscribe: ${unsubscribeUrl}`;
    const html = input.html ? `${input.html}<p><a href="${unsubscribeUrl}">Unsubscribe</a></p>` : undefined;
    const result = await provider.send({ to: lead.email, from: getEmailFrom(), subject: input.subject, text, html, idempotencyKey: queued.id });
    await database.$transaction([
      database.emailEvent.update({ where: { id: queued.id }, data: { providerMessageId: result.messageId } }),
      database.emailEvent.create({ data: { workspaceId: context.workspaceId, leadId: lead.id, type: EmailEventType.SENT, provider: result.provider, providerMessageId: result.messageId, occurredAt: result.acceptedAt, metadata: { queuedEventId: queued.id, mock: result.provider === "mock" } } }),
      database.leadActivity.create({ data: { workspaceId: context.workspaceId, leadId: lead.id, actorId: context.userId, type: LeadActivityType.EMAIL_SENT, summary: result.provider === "mock" ? `Mock email queued: “${input.subject}”.` : `Email sent: “${input.subject}”.`, metadata: { provider: result.provider, providerMessageId: result.messageId, subject: input.subject } } }),
    ]);
    return { queuedEventId: queued.id, provider: result.provider, providerMessageId: result.messageId, status: EmailEventType.SENT, simulated: result.provider === "mock" };
  } catch (error) {
    await database.emailEvent.create({ data: { workspaceId: context.workspaceId, leadId: lead.id, type: EmailEventType.FAILED, provider: provider.name, metadata: { queuedEventId: queued.id, error: error instanceof Error ? error.message : "Provider failure" } } });
    throw new ApiError(502, "EMAIL_PROVIDER_FAILED", "The email provider could not accept the message.");
  }
}

export async function ingestEmailWebhook(database: PrismaClient, provider: string, input: EmailWebhookInput) {
  const duplicate = await database.emailEvent.findUnique({ where: { providerEventId: input.eventId } });
  if (duplicate) {
    if (input.type === EmailEventType.REPLIED) await applyReply(database, provider, input, duplicate.workspaceId, duplicate.leadId);
    else await applyWebhookSuppression(database, provider, input, duplicate.workspaceId, duplicate.leadId);
    return { event: duplicate, duplicate: true };
  }
  const origin = await database.emailEvent.findFirst({ where: { provider, providerMessageId: input.messageId }, orderBy: { occurredAt: "asc" } });
  if (!origin) throw new ApiError(404, "EMAIL_MESSAGE_NOT_FOUND", "The provider message was not found.");
  try {
    const event = await database.emailEvent.create({ data: { workspaceId: origin.workspaceId, leadId: origin.leadId, type: input.type, provider, providerMessageId: input.messageId, providerEventId: input.eventId, occurredAt: new Date(input.occurredAt), metadata: (input.metadata ?? {}) as Prisma.InputJsonValue } });
    if (input.type === EmailEventType.REPLIED) await applyReply(database, provider, input, origin.workspaceId, origin.leadId);
    else await applyWebhookSuppression(database, provider, input, origin.workspaceId, origin.leadId);
    return { event, duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const event = await database.emailEvent.findUniqueOrThrow({ where: { providerEventId: input.eventId } });
      if (input.type === EmailEventType.REPLIED) await applyReply(database, provider, input, event.workspaceId, event.leadId);
      else await applyWebhookSuppression(database, provider, input, event.workspaceId, event.leadId);
      return { event, duplicate: true };
    }
    throw error;
  }
}

async function applyReply(database: PrismaClient, provider: string, input: EmailWebhookInput, workspaceId: string, leadId: string | null) {
  if (!leadId) return;
  const occurredAt = new Date(input.occurredAt);
  const stepRun = await database.sequenceStepRun.findFirst({
    where: { providerMessageId: input.messageId, enrollment: { workspaceId, leadId } },
    select: { enrollmentId: true },
  });
  const preview = typeof input.metadata?.textPreview === "string" ? input.metadata.textPreview.slice(0, 280) : null;
  await database.$transaction(async (tx) => {
    if (stepRun) {
      await tx.sequenceEnrollment.updateMany({
        where: { id: stepRun.enrollmentId, status: { in: [SequenceEnrollmentStatus.PENDING, SequenceEnrollmentStatus.RUNNING, SequenceEnrollmentStatus.COMPLETED, SequenceEnrollmentStatus.FAILED] } },
        data: { status: SequenceEnrollmentStatus.REPLIED, error: null, completedAt: occurredAt, nextRunAt: null },
      });
      await tx.sequenceStepRun.updateMany({
        where: { enrollmentId: stepRun.enrollmentId, status: { in: [SequenceStepRunStatus.PENDING, SequenceStepRunStatus.PROCESSING, SequenceStepRunStatus.FAILED] } },
        data: { status: SequenceStepRunStatus.CANCELLED, error: "Stopped because the lead replied.", completedAt: occurredAt, lockToken: null, lockedAt: null },
      });
    }
    await tx.leadActivity.upsert({
      where: { sourceKey: `email-reply:${provider}:${input.eventId}` },
      create: { sourceKey: `email-reply:${provider}:${input.eventId}`, workspaceId, leadId, type: LeadActivityType.EMAIL_REPLIED, summary: preview ? `Email reply received: “${preview}”` : "Email reply received.", occurredAt, metadata: { provider, providerEventId: input.eventId, providerMessageId: input.messageId, sequenceEnrollmentId: stepRun?.enrollmentId ?? null, textPreview: preview } },
      update: {},
    });
    await tx.lead.update({ where: { id: leadId }, data: { lastActivityAt: occurredAt } });
  });
}

async function applyWebhookSuppression(database: PrismaClient, provider: string, input: EmailWebhookInput, workspaceId: string, leadId: string | null) {
  const reason = input.type === EmailEventType.BOUNCED ? SuppressionReason.BOUNCED : input.type === EmailEventType.COMPLAINED ? SuppressionReason.COMPLAINED : input.type === EmailEventType.UNSUBSCRIBED ? SuppressionReason.UNSUBSCRIBED : null;
  if (!reason || !leadId) return;
  const lead = await database.lead.findUnique({ where: { id: leadId } });
  if (lead?.email) await suppressEmail(database, { workspaceId, leadId, email: lead.email, reason, details: `Reported by ${provider} webhook ${input.eventId}.` }, new Date(input.occurredAt));
}
