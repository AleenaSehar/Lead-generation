import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { generateLeadInsight } from "@/lib/ai/service";

export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try { const { leadId } = await params; return dataResponse(await generateLeadInsight(getDatabase(), await requireApiWorkspace(), leadId)); }
  catch (error) { return errorResponse(error); }
}
