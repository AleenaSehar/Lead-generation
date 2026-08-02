import { ApiError } from "@/lib/api/errors";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { createPublicBooking, getPublicBookingPage, listAvailableSlots } from "@/lib/bookings/service";
import { bookingDateSchema, publicBookingSchema } from "@/lib/bookings/validation";
import { getDatabase } from "@/lib/database";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  try { const { publicId } = await params; const date = new URL(request.url).searchParams.get("date"); return dataResponse(date ? await listAvailableSlots(getDatabase(), publicId, bookingDateSchema.parse(date)) : await getPublicBookingPage(getDatabase(), publicId)); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  try { const { publicId } = await params; return dataResponse(await createPublicBooking(getDatabase(), publicId, publicBookingSchema.parse(await parseJsonRequest(request))), 201); } catch (error) { if (error instanceof SyntaxError) return errorResponse(new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.")); return errorResponse(error); }
}
