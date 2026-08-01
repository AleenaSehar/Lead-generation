import { describe, expect, it } from "vitest";
import { ScoringRuleField, ScoringRuleOperator } from "@/generated/prisma/enums";
import { calculateLeadScore } from "@/lib/scoring/service";

const lead = { source: "WEBSITE", status: "NEW", jobTitle: "Co-Founder", companyName: "Acme", companyDomain: "acme.test", email: "founder@acme.test", phone: null, consentAt: new Date() };
const rule = (id: string, name: string, field: ScoringRuleField, operator: ScoringRuleOperator, points: number, value: string | null = null) => ({ id, name, field, operator, points, value });

describe("calculateLeadScore", () => {
  it("returns a transparent matched-rule breakdown", () => {
    const result = calculateLeadScore(lead, [
      rule("1", "Founder", ScoringRuleField.JOB_TITLE, ScoringRuleOperator.CONTAINS, 40, "founder"),
      rule("2", "Has consent", ScoringRuleField.CONSENT, ScoringRuleOperator.EXISTS, 25),
      rule("3", "Missing phone", ScoringRuleField.PHONE, ScoringRuleOperator.NOT_EXISTS, -10),
    ]);
    expect(result.score).toBe(55);
    expect(result.details.matchedRules.map((item) => item.name)).toEqual(["Founder", "Has consent", "Missing phone"]);
  });

  it("clamps scores between zero and one hundred", () => {
    expect(calculateLeadScore(lead, [rule("1", "High", ScoringRuleField.EMAIL, ScoringRuleOperator.EXISTS, 150)]).score).toBe(100);
    expect(calculateLeadScore(lead, [rule("2", "Low", ScoringRuleField.EMAIL, ScoringRuleOperator.EXISTS, -50)]).score).toBe(0);
  });
});
