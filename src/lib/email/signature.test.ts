import { describe, expect, it } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "@/lib/email/signature";

describe("email webhook signatures", () => {
  const secret = "development-secret-with-at-least-32-characters";
  it("accepts an exact HMAC and rejects changed payloads", () => {
    const payload = JSON.stringify({ eventId: "evt_1" });
    const signature = signWebhookPayload(payload, secret);
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(`${payload} `, signature, secret)).toBe(false);
  });
  it("fails closed for missing signatures and weak secrets", () => {
    expect(verifyWebhookSignature("{}", null, secret)).toBe(false);
    expect(verifyWebhookSignature("{}", "sha256=nope", "short")).toBe(false);
  });
});
