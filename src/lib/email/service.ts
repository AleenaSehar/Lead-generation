import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { EmailEventType, LeadActivityType } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import { getEmailFrom } from "@/lib/email/config";
import type { EmailProvider } from "@/lib/email/provider";
import type { EmailWebhookInput, SendEmailInput } from "@/lib/email/validation";
import { assertLeadPermission } from "@/lib/leads/permissions";
import type { LeadServiceContext } from "@/lib/leads/service";

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
    const result = await provider.send({ to: lead.email, from: getEmailFrom(), subject: input.subject, text: input.text, html: input.html, idempotencyKey: queued.id });
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
  if (duplicate) return { event: duplicate, duplicate: true };
  const origin = await database.emailEvent.findFirst({ where: { provider, providerMessageId: input.messageId }, orderBy: { occurredAt: "asc" } });
  if (!origin) throw new ApiError(404, "EMAIL_MESSAGE_NOT_FOUND", "The provider message was not found.");
  try {
    const event = await database.emailEvent.create({ data: { workspaceId: origin.workspaceId, leadId: origin.leadId, type: input.type, provider, providerMessageId: input.messageId, providerEventId: input.eventId, occurredAt: new Date(input.occurredAt), metadata: (input.metadata ?? {}) as Prisma.InputJsonValue } });
    return { event, duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { event: await database.emailEvent.findUniqueOrThrow({ where: { providerEventId: input.eventId } }), duplicate: true };
    }
    throw error;
  }
}
