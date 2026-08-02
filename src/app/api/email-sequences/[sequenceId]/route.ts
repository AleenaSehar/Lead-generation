import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { archiveEmailSequence, updateEmailSequence } from "@/lib/sequences/service";
import { updateEmailSequenceSchema } from "@/lib/sequences/validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ sequenceId: string }> };
export async function PATCH(request: Request, { params }: Context) { try { const { sequenceId } = await params; return dataResponse(await updateEmailSequence(getDatabase(), await requireApiWorkspace(), sequenceId, updateEmailSequenceSchema.parse(await parseJsonRequest(request)))); } catch (error) { return errorResponse(error); } }
export async function DELETE(_request: Request, { params }: Context) { try { const { sequenceId } = await params; return dataResponse(await archiveEmailSequence(getDatabase(), await requireApiWorkspace(), sequenceId)); } catch (error) { return errorResponse(error); } }
