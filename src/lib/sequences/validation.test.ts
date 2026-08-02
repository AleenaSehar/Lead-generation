import { describe, expect, it } from "vitest";
import { emailSequenceSchema } from "@/lib/sequences/validation";

describe("email sequence validation", () => {
  it("accepts a bounded ordered draft", () => {
    expect(emailSequenceSchema.parse({ name: "Follow-up", steps: [{ subject: "Hello", body: "Message", delayMinutes: 60 }] }).steps).toHaveLength(1);
  });
  it("rejects excessive waits and more than twenty steps", () => {
    expect(() => emailSequenceSchema.parse({ name: "Invalid", steps: [{ subject: "Hi", body: "Body", delayMinutes: 43_201 }] })).toThrow();
    expect(() => emailSequenceSchema.parse({ name: "Too many", steps: Array.from({ length: 21 }, () => ({ subject: "Hi", body: "Body", delayMinutes: 0 })) })).toThrow();
  });
});
