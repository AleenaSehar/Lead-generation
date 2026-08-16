import { z } from "zod";
import { LeadRoutingMode, LeadRoutingRuleType, LeadSourceType } from "@/generated/prisma/enums";

export const assignmentSchema = z.object({
  ownerId: z.string().cuid().nullable(),
}).strict();

export const routingSettingsSchema = z.object({
  mode: z.enum(LeadRoutingMode),
}).strict();

export const routingRuleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(LeadRoutingRuleType),
  ownerId: z.string().cuid(),
  source: z.enum(LeadSourceType).nullable().optional(),
  minScore: z.number().int().min(0).max(100).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.type === LeadRoutingRuleType.SOURCE && !value.source) context.addIssue({ code: "custom", path: ["source"], message: "Choose a lead source." });
  if (value.type === LeadRoutingRuleType.MIN_SCORE && value.minScore == null) context.addIssue({ code: "custom", path: ["minScore"], message: "Enter a minimum score." });
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type RoutingSettingsInput = z.infer<typeof routingSettingsSchema>;
export type RoutingRuleInput = z.infer<typeof routingRuleSchema>;
