import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { requireApiWorkspace } from "@/lib/api/auth";
import { updateCaptureForm } from "@/lib/capture-forms/service";
import { updateCaptureFormSchema } from "@/lib/capture-forms/validation";
import { getDatabase } from "@/lib/database";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ formId: string }> },
) {
  try {
    const context = await requireApiWorkspace();
    const { formId } = await params;
    const input = updateCaptureFormSchema.parse(await parseJsonRequest(request));
    return dataResponse(await updateCaptureForm(getDatabase(), context, formId, input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ formId: string }> },
) {
  try {
    const context = await requireApiWorkspace();
    const { formId } = await params;
    return dataResponse(
      await updateCaptureForm(getDatabase(), context, formId, { status: "ARCHIVED" }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
