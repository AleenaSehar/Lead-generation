import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { CaptureFormStatus, LeadActivityType, LeadSourceType } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { LeadServiceContext } from "@/lib/leads/service";
import type {
  CaptureFormInput,
  PublicSubmissionInput,
  UpdateCaptureFormInput,
} from "./validation";

function assertManage(role: LeadServiceContext["role"]) {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new ApiError(403, "INSUFFICIENT_ROLE", "Only workspace owners and admins can manage forms.");
  }
}

function captureFields(existing: Prisma.JsonValue | null, message?: string) {
  if (!message) return undefined;
  const current = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return { ...current, captureMessage: message } as Prisma.InputJsonObject;
}

export async function listCaptureForms(database: PrismaClient, context: LeadServiceContext) {
  return database.captureForm.findMany({
    where: { workspaceId: context.workspaceId, status: { not: CaptureFormStatus.ARCHIVED } },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCaptureForm(
  database: PrismaClient,
  context: LeadServiceContext,
  input: CaptureFormInput,
) {
  assertManage(context.role);
  return database.captureForm.create({
    data: { ...input, workspaceId: context.workspaceId, createdById: context.userId },
    include: { _count: { select: { submissions: true } } },
  });
}

export async function updateCaptureForm(
  database: PrismaClient,
  context: LeadServiceContext,
  formId: string,
  input: UpdateCaptureFormInput,
) {
  assertManage(context.role);
  const existing = await database.captureForm.findFirst({
    where: { id: formId, workspaceId: context.workspaceId },
  });
  if (!existing) throw new ApiError(404, "FORM_NOT_FOUND", "Capture form was not found.");
  return database.captureForm.update({
    where: { id: existing.id },
    data: input,
    include: { _count: { select: { submissions: true } } },
  });
}

export async function getPublicForm(database: PrismaClient, publicId: string) {
  const form = await database.captureForm.findUnique({ where: { publicId } });
  if (!form || form.status !== CaptureFormStatus.ACTIVE) {
    throw new ApiError(404, "FORM_NOT_FOUND", "This form is not available.");
  }
  return form;
}

export async function submitPublicForm(
  database: PrismaClient,
  publicId: string,
  input: PublicSubmissionInput,
  requestMetadata: { ip: string | null; userAgent: string | null },
) {
  const form = await getPublicForm(database, publicId);
  if (input.website) throw new ApiError(400, "INVALID_SUBMISSION", "Submission was rejected.");
  if (form.requireConsent && !input.consent) {
    throw new ApiError(400, "CONSENT_REQUIRED", "Consent is required to submit this form.");
  }

  const ipHash = requestMetadata.ip
    ? createHash("sha256").update(`${publicId}:${requestMetadata.ip}`).digest("hex")
    : null;
  if (ipHash) {
    const recent = await database.captureSubmission.count({
      where: {
        formId: form.id,
        ipHash,
        submittedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recent >= 5) {
      throw new ApiError(429, "RATE_LIMITED", "Too many submissions. Please try again later.");
    }
  }

  const now = new Date();
  return database.$transaction(async (transaction) => {
    const existing = await transaction.lead.findUnique({
      where: { workspaceId_email: { workspaceId: form.workspaceId, email: input.email } },
    });
    const customFields = captureFields(existing?.customFields ?? null, input.message);
    const lead = existing
      ? await transaction.lead.update({
          where: { id: existing.id },
          data: {
            ...(input.firstName ? { firstName: input.firstName } : {}),
            ...(input.lastName ? { lastName: input.lastName } : {}),
            ...(input.companyName ? { companyName: input.companyName } : {}),
            ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
            ...(input.companyDomain ? { companyDomain: input.companyDomain } : {}),
            ...(input.phone ? { phone: input.phone } : {}),
            ...(customFields ? { customFields } : {}),
            ...(input.consent ? { consentAt: now, consentSource: `Capture form: ${form.name}` } : {}),
            lastActivityAt: now,
          },
        })
      : await transaction.lead.create({
          data: {
            workspaceId: form.workspaceId,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            companyName: input.companyName,
            jobTitle: input.jobTitle,
            companyDomain: input.companyDomain,
            phone: input.phone,
            customFields,
            source: LeadSourceType.WEBSITE,
            sourceDetails: { captureFormId: form.id, publicId: form.publicId },
            consentAt: input.consent ? now : null,
            consentSource: input.consent ? `Capture form: ${form.name}` : null,
            lastActivityAt: now,
          },
        });

    await transaction.captureSubmission.create({
      data: {
        formId: form.id,
        workspaceId: form.workspaceId,
        leadId: lead.id,
        ipHash,
        userAgent: requestMetadata.userAgent?.slice(0, 500),
      },
    });
    await transaction.leadActivity.create({
      data: {
        workspaceId: form.workspaceId,
        leadId: lead.id,
        type: LeadActivityType.FORM_SUBMITTED,
        summary: `Submitted capture form “${form.name}”.`,
        metadata: { captureFormId: form.id, publicId: form.publicId },
        occurredAt: now,
      },
    });
    return { successMessage: form.successMessage };
  });
}
