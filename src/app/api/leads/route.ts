import { NextResponse } from "next/server";
import { requireApiWorkspace } from "@/lib/api/auth";
import { errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { createLead, listLeads } from "@/lib/leads/service";
import { createLeadSchema, leadListQuerySchema } from "@/lib/leads/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await requireApiWorkspace();
    const query = leadListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const result = await listLeads(getDatabase(), context, query);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiWorkspace();
    const input = createLeadSchema.parse(await parseJsonRequest(request));
    const lead = await createLead(getDatabase(), context, input);
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
