import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { getEmailProvider } from "@/lib/email/config";
import { sendLeadEmail } from "@/lib/email/service";
import { sendEmailSchema } from "@/lib/email/validation";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const context = await requireApiWorkspace();
    const input = sendEmailSchema.parse(await parseJsonRequest(request));
    return dataResponse(await sendLeadEmail(getDatabase(), getEmailProvider(), context, input), 202);
  } catch (error) { return errorResponse(error); }
}
