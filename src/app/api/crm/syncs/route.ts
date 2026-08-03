import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { listCrmSyncs } from "@/lib/crm/service";
import { getDatabase } from "@/lib/database";
export const runtime = "nodejs";
export async function GET() { try { return dataResponse(await listCrmSyncs(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
