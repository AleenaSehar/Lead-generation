import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getCrmConnection, saveCrmConnection } from "@/lib/crm/service";
import { crmConnectionSchema } from "@/lib/crm/validation";
import { getDatabase } from "@/lib/database";
export const runtime = "nodejs";
export async function GET() { try { return dataResponse(await getCrmConnection(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
export async function PUT(request: Request) { try { return dataResponse(await saveCrmConnection(getDatabase(), await requireApiWorkspace(), crmConnectionSchema.parse(await parseJsonRequest(request)))); } catch (error) { return errorResponse(error); } }
