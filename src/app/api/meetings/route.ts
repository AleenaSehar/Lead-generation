import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse } from "@/lib/api/response";
import { listMeetings } from "@/lib/bookings/service";
import { getDatabase } from "@/lib/database";

export const runtime = "nodejs";
export async function GET() { try { return dataResponse(await listMeetings(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
