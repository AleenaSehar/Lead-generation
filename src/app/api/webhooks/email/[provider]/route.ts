import { ApiError } from "@/lib/api/errors";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { getEmailProvider } from "@/lib/email/config";
import { ingestEmailWebhook } from "@/lib/email/service";
import { verifyWebhookSignature } from "@/lib/email/signature";
import { emailWebhookSchema } from "@/lib/email/validation";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    if (provider !== getEmailProvider().name) throw new ApiError(404, "EMAIL_PROVIDER_NOT_FOUND", "Email provider was not found.");
    const payload = await request.text();
    const secret = process.env.EMAIL_WEBHOOK_SECRET ?? "";
    if (!verifyWebhookSignature(payload, request.headers.get("x-leadflow-signature"), secret)) throw new ApiError(401, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature is invalid.");
    return dataResponse(await ingestEmailWebhook(getDatabase(), provider, emailWebhookSchema.parse(JSON.parse(payload))));
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse(new ApiError(400, "INVALID_JSON", "Request body must be valid JSON."));
    return errorResponse(error);
  }
}
