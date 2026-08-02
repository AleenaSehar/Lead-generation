import { z } from "zod";

export const enrollSequenceSchema = z.object({
  leadId: z.string().trim().min(1),
  emailSequenceId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
}).strict();

export const enrollmentListQuerySchema = z.object({ leadId: z.string().trim().min(1) });

export type EnrollSequenceInput = z.infer<typeof enrollSequenceSchema>;
