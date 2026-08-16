import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { assignLead } from "@/lib/routing/service";
import { assignmentSchema } from "@/lib/routing/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ leadId: string }> };

export async function PATCH(request: Request, routeContext: Context) {
  try { const { leadId } = await routeContext.params; return dataResponse(await assignLead(getDatabase(), await requireApiWorkspace(), leadId, assignmentSchema.parse(await parseJsonRequest(request)))); }
  catch (error) { return errorResponse(error); }
}
