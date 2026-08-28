import { z } from "zod";

export const leadInsightResultSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1).max(400),
  reasons: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
  nextAction: z.string().trim().min(1).max(200),
});
