import { describe, expect, it } from "vitest";
import { leadInsightResultSchema } from "@/lib/ai/validation";

describe("leadInsightResultSchema", () => {
  it("accepts a well-formed insight", () => {
    const result = leadInsightResultSchema.safeParse({ fitScore: 70, summary: "Good fit.", reasons: ["Has a job title"], nextAction: "Follow up." });
    expect(result.success).toBe(true);
  });

  it("rejects a fit score outside 0-100", () => {
    expect(leadInsightResultSchema.safeParse({ fitScore: 150, summary: "x", reasons: ["x"], nextAction: "x" }).success).toBe(false);
    expect(leadInsightResultSchema.safeParse({ fitScore: -1, summary: "x", reasons: ["x"], nextAction: "x" }).success).toBe(false);
  });

  it("rejects an empty reasons array", () => {
    expect(leadInsightResultSchema.safeParse({ fitScore: 50, summary: "x", reasons: [], nextAction: "x" }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(leadInsightResultSchema.safeParse({ fitScore: 50 }).success).toBe(false);
  });
});
