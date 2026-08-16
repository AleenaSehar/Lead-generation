import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { createRoutingRule } from "@/lib/routing/service";
import { routingRuleSchema } from "@/lib/routing/validation";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try { return dataResponse(await createRoutingRule(getDatabase(), await requireApiWorkspace(), routingRuleSchema.parse(await parseJsonRequest(request))), 201); }
  catch (error) { return errorResponse(error); }
}
