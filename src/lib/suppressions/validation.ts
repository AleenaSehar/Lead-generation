import { z } from "zod";
import { SuppressionReason } from "@/generated/prisma/enums";

export const createSuppressionSchema = z.object({
  email: z.email().trim().toLowerCase(),
  reason: z.enum([SuppressionReason.MANUAL, SuppressionReason.LEGAL_REQUEST]).default(SuppressionReason.MANUAL),
  details: z.string().trim().max(500).nullable().optional(),
}).strict();

export type CreateSuppressionInput = z.infer<typeof createSuppressionSchema>;
