import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { addLeadNote } from "@/lib/leads/service";
import { leadNoteSchema } from "@/lib/leads/validation";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params;
    return dataResponse(await addLeadNote(getDatabase(), await requireApiWorkspace(), leadId, leadNoteSchema.parse(await parseJsonRequest(request))), 201);
  } catch (error) { return errorResponse(error); }
}
