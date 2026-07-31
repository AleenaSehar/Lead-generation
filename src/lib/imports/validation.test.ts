import { describe, expect, it } from "vitest";
import { csvImportSchema } from "./validation";

describe("CSV import validation", () => {
  it("requires an email mapping and bounded rows", () => {
    expect(csvImportSchema.parse({ rows: [{ Email: "a@example.com" }], mapping: { email: "Email" } })).toMatchObject({ duplicateStrategy: "SKIP" });
    expect(() => csvImportSchema.parse({ rows: [], mapping: { email: "Email" } })).toThrow();
    expect(() => csvImportSchema.parse({ rows: [{ Email: "a@example.com" }], mapping: {} })).toThrow();
  });
});
