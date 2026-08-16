import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { deleteRoutingRule } from "@/lib/routing/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ ruleId: string }> };
export async function DELETE(_request: Request, routeContext: Context) {
  try { const { ruleId } = await routeContext.params; return dataResponse(await deleteRoutingRule(getDatabase(), await requireApiWorkspace(), ruleId)); }
  catch (error) { return errorResponse(error); }
}
