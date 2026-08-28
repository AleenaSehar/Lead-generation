import { describe, expect, it } from "vitest";
import { MockLeadInsightProvider } from "@/lib/ai/mock-provider";
import { leadInsightResultSchema } from "@/lib/ai/validation";

describe("mock lead insight provider", () => {
  it("produces schema-valid output with no network call", async () => {
    const provider = new MockLeadInsightProvider();
    const result = await provider.generate({ firstName: "Jordan", lastName: null, jobTitle: "VP Sales", companyName: "Acme", companyDomain: "acme.test", source: "API", status: "NEW", ruleScore: 60, hasConsent: true });
    expect(() => leadInsightResultSchema.parse(result)).not.toThrow();
  });

  it("scores a mostly-empty lead lower than a well-qualified one", async () => {
    const provider = new MockLeadInsightProvider();
    const thin = await provider.generate({ firstName: null, lastName: null, jobTitle: null, companyName: null, companyDomain: null, source: "MANUAL", status: "NEW", ruleScore: 0, hasConsent: false });
    const rich = await provider.generate({ firstName: "Jordan", lastName: "Lee", jobTitle: "VP Sales", companyName: "Acme", companyDomain: "acme.test", source: "API", status: "NEW", ruleScore: 60, hasConsent: true });
    expect(rich.fitScore).toBeGreaterThan(thin.fitScore);
  });

  it("clamps the score within 0-100", async () => {
    const provider = new MockLeadInsightProvider();
    const result = await provider.generate({ firstName: "A", lastName: "B", jobTitle: "CEO", companyName: "Acme", companyDomain: "acme.test", source: "API", status: "NEW", ruleScore: 100, hasConsent: true });
    expect(result.fitScore).toBeLessThanOrEqual(100);
  });
});
