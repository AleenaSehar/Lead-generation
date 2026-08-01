import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(payload: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyWebhookSignature(payload: string, signature: string | null, secret: string) {
  if (!signature || secret.length < 32) return false;
  const expected = Buffer.from(signWebhookPayload(payload, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
