import { ApiError } from "@/lib/api/errors";
import type { EmailProvider } from "@/lib/email/provider";
import { MockEmailProvider } from "@/lib/email/mock-provider";

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockEmailProvider();
  throw new ApiError(503, "EMAIL_PROVIDER_DISABLED", `Email provider “${provider}” is not enabled.`);
}

export function getEmailFrom() {
  return process.env.EMAIL_FROM?.trim() || "LeadFlow Dev <no-reply@leadflow.local>";
}
