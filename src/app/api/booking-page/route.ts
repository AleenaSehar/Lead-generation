import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getBookingPage, saveBookingPage } from "@/lib/bookings/service";
import { bookingPageSchema } from "@/lib/bookings/validation";
import { getDatabase } from "@/lib/database";

export const runtime = "nodejs";
export async function GET() { try { return dataResponse(await getBookingPage(getDatabase(), await requireApiWorkspace())); } catch (error) { return errorResponse(error); } }
export async function PUT(request: Request) { try { return dataResponse(await saveBookingPage(getDatabase(), await requireApiWorkspace(), bookingPageSchema.parse(await parseJsonRequest(request)))); } catch (error) { return errorResponse(error); } }
