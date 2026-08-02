import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { enrollLeadInSequence, listLeadEnrollments } from "@/lib/workflows/service";
import { enrollmentListQuerySchema, enrollSequenceSchema } from "@/lib/workflows/validation";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const query = enrollmentListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)); return dataResponse(await listLeadEnrollments(getDatabase(), await requireApiWorkspace(), query.leadId)); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const context = await requireApiWorkspace(); return dataResponse(await enrollLeadInSequence(getDatabase(), context, enrollSequenceSchema.parse(await parseJsonRequest(request))), 201); } catch (error) { return errorResponse(error); } }
