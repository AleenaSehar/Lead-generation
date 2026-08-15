import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { markNotificationRead } from "@/lib/notifications/service";

export const runtime = "nodejs";
export async function PATCH(_request: Request, { params }: { params: Promise<{ notificationId: string }> }) { try { const { notificationId } = await params; return dataResponse(await markNotificationRead(getDatabase(), await requireApiWorkspace(), notificationId)); } catch (error) { return errorResponse(error); } }
