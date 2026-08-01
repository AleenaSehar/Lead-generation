import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { createScoringRule, listScoringRules } from "@/lib/scoring/service";
import { scoringRuleSchema } from "@/lib/scoring/validation";
export const runtime = "nodejs";
export async function GET() { try { return dataResponse(await listScoringRules(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const context = await requireApiWorkspace(); return dataResponse(await createScoringRule(getDatabase(), context, scoringRuleSchema.parse(await parseJsonRequest(request))), 201); } catch (error) { return errorResponse(error); } }
