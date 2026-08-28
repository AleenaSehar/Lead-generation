import type { LeadInsightInput, LeadInsightProvider, LeadInsightResult } from "@/lib/ai/provider";

export class MockLeadInsightProvider implements LeadInsightProvider {
  readonly name = "mock";
  async generate(input: LeadInsightInput): Promise<LeadInsightResult> {
    const reasons: string[] = [];
    let fitScore = 40;
    if (input.jobTitle) { reasons.push(`Job title on file: ${input.jobTitle}.`); fitScore += 15; }
    if (input.companyDomain) { reasons.push(`Company domain on file: ${input.companyDomain}.`); fitScore += 10; }
    if (input.hasConsent) { reasons.push("Lead has recorded consent to contact."); fitScore += 15; }
    if (input.ruleScore >= 50) { reasons.push(`Rule-based score is already ${input.ruleScore}.`); fitScore += 10; }
    if (!reasons.length) reasons.push("Limited profile data is available for this lead.");
    return {
      fitScore: Math.max(0, Math.min(100, fitScore)),
      summary: `Deterministic mock insight for development and CI — no external AI call was made.`,
      reasons,
      nextAction: input.hasConsent ? "Reach out with a personalized follow-up." : "Confirm consent before any outreach.",
    };
  }
}
