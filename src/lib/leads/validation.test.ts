import { describe, expect, it } from "vitest";
import { LeadSourceType, LeadStatus } from "@/generated/prisma/enums";
import { createLeadSchema, leadListQuerySchema, updateLeadSchema } from "./validation";

describe("lead validation", () => {
  it("normalizes a create request and applies safe defaults", () => {
    const input = createLeadSchema.parse({
      email: "  PERSON@Example.com ",
      firstName: "  Sam  ",
    });

    expect(input).toMatchObject({
      email: "person@example.com",
      firstName: "Sam",
      status: LeadStatus.NEW,
      source: LeadSourceType.MANUAL,
      score: 0,
    });
  });

  it("rejects unknown and invalid fields", () => {
    expect(() => createLeadSchema.parse({ email: "invalid", extra: true })).toThrow();
    expect(() => updateLeadSchema.parse({ score: 101 })).toThrow();
    expect(() => updateLeadSchema.parse({})).toThrow();
  });

  it("coerces and bounds list parameters", () => {
    expect(leadListQuerySchema.parse({ page: "2", pageSize: "25", minScore: "40" })).toMatchObject({
      page: 2,
      pageSize: 25,
      minScore: 40,
    });
    expect(() => leadListQuerySchema.parse({ pageSize: "101" })).toThrow();
  });
});
