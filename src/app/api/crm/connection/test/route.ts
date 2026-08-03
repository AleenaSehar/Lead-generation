import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { testCrmConnection } from "@/lib/crm/service";
import { getDatabase } from "@/lib/database";
export const runtime = "nodejs";
export async function POST() { try { return dataResponse(await testCrmConnection(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
