import { z } from "zod";
import { ScoringRuleField, ScoringRuleOperator } from "@/generated/prisma/enums";

const scoringRuleFields = z.object({
  name: z.string().trim().min(2).max(80),
  field: z.enum(ScoringRuleField),
  operator: z.enum(ScoringRuleOperator),
  value: z.string().trim().max(160).optional().nullable(),
  points: z.number().int().min(-100).max(100),
  isActive: z.boolean().default(true),
}).strict();

function validateValue(rule: { operator?: ScoringRuleOperator; value?: string | null }, context: z.RefinementCtx) {
  if ((rule.operator === ScoringRuleOperator.EQUALS || rule.operator === ScoringRuleOperator.CONTAINS) && !rule.value) {
    context.addIssue({ code: "custom", path: ["value"], message: "A comparison value is required." });
  }
}

export const scoringRuleSchema = scoringRuleFields.superRefine(validateValue);

export const updateScoringRuleSchema = scoringRuleFields.partial().superRefine(validateValue).refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export type ScoringRuleInput = z.infer<typeof scoringRuleSchema>;
export type UpdateScoringRuleInput = z.infer<typeof updateScoringRuleSchema>;
