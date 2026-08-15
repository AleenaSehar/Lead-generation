import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { listNotifications, markAllNotificationsRead } from "@/lib/notifications/service";

export const runtime = "nodejs";
export async function GET() { try { return dataResponse(await listNotifications(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
export async function PATCH() { try { return dataResponse(await markAllNotificationsRead(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
