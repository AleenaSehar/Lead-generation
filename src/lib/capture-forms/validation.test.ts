import { describe, expect, it } from "vitest";
import { captureFormSchema, publicSubmissionSchema } from "./validation";

describe("capture form validation", () => {
  it("applies safe form defaults", () => {
    expect(captureFormSchema.parse({ name: "Demo", title: "Talk to us" })).toMatchObject({
      status: "ACTIVE",
      requireConsent: true,
      collectFirstName: true,
    });
  });

  it("normalizes public email and rejects unknown fields", () => {
    expect(publicSubmissionSchema.parse({ email: " TEST@Example.com ", consent: true }).email).toBe(
      "test@example.com",
    );
    expect(() => publicSubmissionSchema.parse({ email: "test@example.com", extra: true })).toThrow();
  });
});
