import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { createSuppression, listSuppressions } from "@/lib/suppressions/service";
import { createSuppressionSchema } from "@/lib/suppressions/validation";

export const runtime = "nodejs";
export async function GET() { try { return dataResponse(await listSuppressions(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { return dataResponse(await createSuppression(getDatabase(), await requireApiWorkspace(), createSuppressionSchema.parse(await parseJsonRequest(request))), 201); } catch (error) { return errorResponse(error); } }
