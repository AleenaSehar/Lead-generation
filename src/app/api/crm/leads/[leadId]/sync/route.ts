import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { syncLeadToCrm } from "@/lib/crm/service";
import { getDatabase } from "@/lib/database";
export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: Promise<{ leadId: string }> }) { try { const { leadId } = await params; return dataResponse(await syncLeadToCrm(getDatabase(), await requireApiWorkspace(), leadId)); } catch (error) { return errorResponse(error); } }
