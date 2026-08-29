import { describe, expect, it } from "vitest";
import { MockLeadInsightProvider } from "@/lib/ai/mock-provider";
import type { LeadInsightContext } from "@/lib/ai/provider";
import { leadInsightSchema } from "@/lib/ai/validation";

const context: LeadInsightContext = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya@example.com",
  jobTitle: "VP Sales",
  companyName: "Acme",
  companyDomain: "acme.com",
  status: "QUALIFIED",
  source: "WEBSITE",
  score: 64,
  scoreDetails: { version: 1, rawScore: 64, matchedRules: [] },
  consentAt: new Date("2026-01-01T00:00:00Z"),
  lastActivityAt: new Date("2026-01-02T00:00:00Z"),
};

describe("MockLeadInsightProvider", () => {
  it("is deterministic for the same input", async () => {
    const provider = new MockLeadInsightProvider();
    const first = await provider.generateInsight(context);
    const second = await provider.generateInsight(context);
    expect(first).toEqual(second);
  });

  it("produces schema-valid output", async () => {
    const provider = new MockLeadInsightProvider();
    const result = await provider.generateInsight(context);
    expect(leadInsightSchema.safeParse(result).success).toBe(true);
  });

  it("derives the fit score from the rule-based score", async () => {
    const provider = new MockLeadInsightProvider();
    const result = await provider.generateInsight(context);
    expect(result.fitScore).toBe(64);
  });

  it("falls back to a generic reason when the profile has no distinguishing fields", async () => {
    const provider = new MockLeadInsightProvider();
    const result = await provider.generateInsight({
      ...context,
      jobTitle: null,
      companyName: null,
      consentAt: null,
      lastActivityAt: null,
    });
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.nextAction).toBe("Collect consent before attempting any outreach.");
  });
});
