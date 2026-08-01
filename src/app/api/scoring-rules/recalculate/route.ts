import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { recalculateWorkspaceScores } from "@/lib/scoring/service";
export const runtime = "nodejs";
export async function POST() { try { return dataResponse(await recalculateWorkspaceScores(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
