import { describe, expect, it } from "vitest";
import { formatLeadStatus, formatRelativeTime, getLeadName } from "./leads";

describe("lead display helpers", () => {
  it("builds a display name with useful fallbacks", () => {
    expect(getLeadName({ firstName: "Maya", lastName: "Chen", email: "maya@example.com" })).toBe(
      "Maya Chen",
    );
    expect(getLeadName({ firstName: null, lastName: null, email: "maya@example.com" })).toBe(
      "maya@example.com",
    );
  });

  it("formats API enum values for the interface", () => {
    expect(formatLeadStatus("CSV_IMPORT")).toBe("Csv import");
    expect(formatLeadStatus("QUALIFIED")).toBe("Qualified");
  });

  it("formats recent timestamps", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("Just now");
  });
});
