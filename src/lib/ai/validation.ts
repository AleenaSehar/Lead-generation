import { z } from "zod";

export const leadInsightSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1),
  reasons: z.array(z.string().trim().min(1)).min(1).max(5),
  nextAction: z.string().trim().min(1),
}).strict();

export type LeadInsightInput = z.infer<typeof leadInsightSchema>;
