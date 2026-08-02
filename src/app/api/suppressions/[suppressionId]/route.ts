import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { removeSuppression } from "@/lib/suppressions/service";

export const runtime = "nodejs";
export async function DELETE(_request: Request, { params }: { params: Promise<{ suppressionId: string }> }) {
  try { const { suppressionId } = await params; return dataResponse(await removeSuppression(getDatabase(), await requireApiWorkspace(), suppressionId)); } catch (error) { return errorResponse(error); }
}
