import { z } from "zod";
import { EmailEventType } from "@/generated/prisma/enums";

export const sendEmailSchema = z.object({
  leadId: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(20_000),
  html: z.string().trim().max(50_000).optional(),
}).strict();

export const emailWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  messageId: z.string().trim().min(1).max(300),
  type: z.enum(EmailEventType),
  occurredAt: z.iso.datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type EmailWebhookInput = z.infer<typeof emailWebhookSchema>;
