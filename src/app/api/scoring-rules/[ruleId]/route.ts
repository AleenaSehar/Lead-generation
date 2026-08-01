import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { deleteScoringRule, updateScoringRule } from "@/lib/scoring/service";
import { updateScoringRuleSchema } from "@/lib/scoring/validation";
export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ ruleId: string }> }) { try { const { ruleId } = await params; return dataResponse(await updateScoringRule(getDatabase(), await requireApiWorkspace(), ruleId, updateScoringRuleSchema.parse(await parseJsonRequest(request)))); } catch (error) { return errorResponse(error); } }
export async function DELETE(_request: Request, { params }: { params: Promise<{ ruleId: string }> }) { try { const { ruleId } = await params; await deleteScoringRule(getDatabase(), await requireApiWorkspace(), ruleId); return dataResponse({ deleted: true }); } catch (error) { return errorResponse(error); } }
