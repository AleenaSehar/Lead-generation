import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api/errors";

type UnsubscribePayload = { v: 1; workspaceId: string; leadId: string; email: string };

function secret() {
  const value = process.env.UNSUBSCRIBE_SECRET?.trim() || process.env.EMAIL_WEBHOOK_SECRET?.trim();
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production") return "leadflow-local-unsubscribe-secret-32";
  throw new ApiError(503, "UNSUBSCRIBE_NOT_CONFIGURED", "Unsubscribe links are not configured.");
}

export function createUnsubscribeToken(payload: Omit<UnsubscribePayload, "v">) {
  const iv = randomBytes(12);
  const key = createHash("sha256").update(secret()).digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ v: 1, ...payload } satisfies UnsubscribePayload), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${encrypted.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload {
  try {
    const [ivValue, encryptedValue, tagValue] = token.split(".");
    if (!ivValue || !encryptedValue || !tagValue) throw new Error("Invalid token");
    const key = createHash("sha256").update(secret()).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
    const payload = JSON.parse(decrypted) as UnsubscribePayload;
    if (payload.v !== 1 || !payload.workspaceId || !payload.leadId || !payload.email) throw new Error("Invalid payload");
    return { ...payload, email: payload.email.toLowerCase() };
  } catch {
    throw new ApiError(400, "INVALID_UNSUBSCRIBE_LINK", "This unsubscribe link is invalid.");
  }
}

export function createUnsubscribeUrl(payload: Omit<UnsubscribePayload, "v">) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:5555").replace(/\/$/, "");
  return `${baseUrl}/unsubscribe/${createUnsubscribeToken(payload)}`;
}
