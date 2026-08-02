import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { cancelEnrollment } from "@/lib/workflows/service";
export const runtime = "nodejs";
export async function DELETE(_request: Request, { params }: { params: Promise<{ enrollmentId: string }> }) { try { const { enrollmentId } = await params; return dataResponse(await cancelEnrollment(getDatabase(), await requireApiWorkspace(), enrollmentId)); } catch (error) { return errorResponse(error); } }
