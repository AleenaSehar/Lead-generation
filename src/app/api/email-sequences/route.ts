import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { createEmailSequence, listEmailSequences } from "@/lib/sequences/service";
import { emailSequenceSchema } from "@/lib/sequences/validation";
export const runtime = "nodejs";
export async function GET() { try { return dataResponse(await listEmailSequences(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const context = await requireApiWorkspace(); return dataResponse(await createEmailSequence(getDatabase(), context, emailSequenceSchema.parse(await parseJsonRequest(request))), 201); } catch (error) { return errorResponse(error); } }
