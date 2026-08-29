import type { LeadInsight, LeadInsightContext, LeadInsightProvider } from "@/lib/ai/provider";

export class MockLeadInsightProvider implements LeadInsightProvider {
  readonly name = "mock";

  async generateInsight(context: LeadInsightContext): Promise<LeadInsight> {
    const fitScore = Math.max(0, Math.min(100, context.score));
    const name = [context.firstName, context.lastName].filter(Boolean).join(" ") || context.email || "This lead";

    const reasons: string[] = [];
    if (context.jobTitle) reasons.push(`Job title on file: ${context.jobTitle}.`);
    if (context.companyName) reasons.push(`Associated with ${context.companyName}.`);
    if (context.consentAt) reasons.push("Has recorded consent to be contacted.");
    if (context.lastActivityAt) reasons.push("Has recent recorded activity.");
    if (!reasons.length) reasons.push(`Rule-based score is currently ${context.score}.`);

    const nextAction = context.consentAt
      ? "Reach out with a tailored follow-up based on the reasons above."
      : "Collect consent before attempting any outreach.";

    return {
      fitScore,
      summary: `${name} has a mock-estimated fit score of ${fitScore}, derived deterministically from the rule-based score and available profile fields.`,
      reasons: reasons.slice(0, 5),
      nextAction,
    };
  }
}
