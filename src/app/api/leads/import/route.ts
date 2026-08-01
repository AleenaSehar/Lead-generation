import { requireApiWorkspace } from "@/lib/api/auth";
import { dataResponse, errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getDatabase } from "@/lib/database";
import { importCsvLeads } from "@/lib/imports/service";
import { csvImportSchema } from "@/lib/imports/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await requireApiWorkspace();
    const input = csvImportSchema.parse(await parseJsonRequest(request));
    return dataResponse(await importCsvLeads(getDatabase(), context, input));
  } catch (error) {
    return errorResponse(error);
  }
}
