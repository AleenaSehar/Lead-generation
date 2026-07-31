import { NextResponse } from "next/server";
import { errorResponse, parseJsonRequest } from "@/lib/api/response";
import { getPublicForm, submitPublicForm } from "@/lib/capture-forms/service";
import { publicSubmissionSchema } from "@/lib/capture-forms/validation";
import { getDatabase } from "@/lib/database";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  try {
    const { publicId } = await params;
    const form = await getPublicForm(getDatabase(), publicId);
    return NextResponse.json({
      data: {
        publicId: form.publicId,
        title: form.title,
        description: form.description,
        successMessage: form.successMessage,
        collectFirstName: form.collectFirstName,
        collectLastName: form.collectLastName,
        collectCompanyName: form.collectCompanyName,
        collectJobTitle: form.collectJobTitle,
        collectCompanyDomain: form.collectCompanyDomain,
        collectPhone: form.collectPhone,
        collectMessage: form.collectMessage,
        requireConsent: form.requireConsent,
        consentText: form.consentText,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  try {
    const { publicId } = await params;
    const input = publicSubmissionSchema.parse(await parseJsonRequest(request));
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const result = await submitPublicForm(getDatabase(), publicId, input, {
      ip: forwardedFor,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
