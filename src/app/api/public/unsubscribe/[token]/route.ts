import { dataResponse, errorResponse } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { unsubscribeWithToken } from "@/lib/suppressions/service";

export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try { const { token } = await params; return dataResponse(await unsubscribeWithToken(getDatabase(), token)); } catch (error) { return errorResponse(error); }
}
