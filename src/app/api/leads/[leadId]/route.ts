import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { archiveLead, getLead, updateLead } from "@/lib/leads/service";
import { updateLeadSchema } from "@/lib/leads/validation";

export const runtime = "nodejs";

interface LeadRouteContext {
  params: Promise<{ leadId: string }>;
}

export async function GET(_request: Request, routeContext: LeadRouteContext) {
  try {
    const context = await requireApiWorkspace();
    const { leadId } = await routeContext.params;
    return dataResponse(await getLead(getDatabase(), context, leadId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, routeContext: LeadRouteContext) {
  try {
    const context = await requireApiWorkspace();
    const { leadId } = await routeContext.params;
    const input = updateLeadSchema.parse(await parseJsonRequest(request));
    return dataResponse(await updateLead(getDatabase(), context, leadId, input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, routeContext: LeadRouteContext) {
  try {
    const context = await requireApiWorkspace();
    const { leadId } = await routeContext.params;
    return dataResponse(await archiveLead(getDatabase(), context, leadId));
  } catch (error) {
    return errorResponse(error);
  }
}
