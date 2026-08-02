import { z } from "zod";

export const emailStepSchema = z.object({
  subject: z.string().trim().min(1, "Enter a subject.").max(200),
  body: z.string().trim().min(1, "Enter an email message.").max(20_000),
  delayMinutes: z.number().int().min(0).max(43_200),
}).strict();

export const emailSequenceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  steps: z.array(emailStepSchema).max(20).default([]),
}).strict();

export const updateEmailSequenceSchema = emailSequenceSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export type EmailSequenceInput = z.infer<typeof emailSequenceSchema>;
export type UpdateEmailSequenceInput = z.infer<typeof updateEmailSequenceSchema>;
