import { describe, expect, it } from "vitest";
import { leadInsightSchema } from "@/lib/ai/validation";

const valid = {
  fitScore: 72,
  summary: "Strong fit based on job title and company size.",
  reasons: ["Matches ideal customer profile.", "Has recorded consent."],
  nextAction: "Schedule a discovery call.",
};

describe("leadInsightSchema", () => {
  it("accepts a valid payload", () => {
    expect(leadInsightSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a fitScore outside 0-100", () => {
    expect(leadInsightSchema.safeParse({ ...valid, fitScore: 101 }).success).toBe(false);
    expect(leadInsightSchema.safeParse({ ...valid, fitScore: -1 }).success).toBe(false);
  });

  it("rejects a non-integer fitScore", () => {
    expect(leadInsightSchema.safeParse({ ...valid, fitScore: 71.5 }).success).toBe(false);
  });

  it("rejects a missing or empty summary", () => {
    expect(leadInsightSchema.safeParse({ ...valid, summary: "" }).success).toBe(false);
    const missingSummary: Record<string, unknown> = { ...valid };
    delete missingSummary.summary;
    expect(leadInsightSchema.safeParse(missingSummary).success).toBe(false);
  });

  it("rejects an empty reasons array", () => {
    expect(leadInsightSchema.safeParse({ ...valid, reasons: [] }).success).toBe(false);
  });

  it("rejects more than 5 reasons", () => {
    expect(leadInsightSchema.safeParse({ ...valid, reasons: ["a", "b", "c", "d", "e", "f"] }).success).toBe(false);
  });

  it("rejects a missing nextAction", () => {
    const missingNextAction: Record<string, unknown> = { ...valid };
    delete missingNextAction.nextAction;
    expect(leadInsightSchema.safeParse(missingNextAction).success).toBe(false);
  });

  it("rejects unknown properties", () => {
    expect(leadInsightSchema.safeParse({ ...valid, extra: "nope" }).success).toBe(false);
  });
});
