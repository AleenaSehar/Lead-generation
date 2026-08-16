import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { getRoutingOverview, updateRoutingSettings } from "@/lib/routing/service";
import { routingSettingsSchema } from "@/lib/routing/validation";

export const runtime = "nodejs";

export async function GET() {
  try { return dataResponse(await getRoutingOverview(getDatabase(), await requireApiWorkspace())); }
  catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try { return dataResponse(await updateRoutingSettings(getDatabase(), await requireApiWorkspace(), routingSettingsSchema.parse(await parseJsonRequest(request)))); }
  catch (error) { return errorResponse(error); }
}
