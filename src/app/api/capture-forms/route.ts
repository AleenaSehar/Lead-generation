import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { requireApiWorkspace } from "@/lib/api/auth";
import { createCaptureForm, listCaptureForms } from "@/lib/capture-forms/service";
import { captureFormSchema } from "@/lib/capture-forms/validation";
import { getDatabase } from "@/lib/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    return dataResponse(await listCaptureForms(getDatabase(), await requireApiWorkspace()));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiWorkspace();
    const input = captureFormSchema.parse(await parseJsonRequest(request));
    return dataResponse(await createCaptureForm(getDatabase(), context, input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
