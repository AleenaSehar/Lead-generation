import type { PrismaClient } from "@/generated/prisma/client";
import { EmailSequenceStatus, WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { LeadServiceContext } from "@/lib/leads/service";
import type { EmailSequenceInput, UpdateEmailSequenceInput } from "@/lib/sequences/validation";

function assertSequenceManager(context: LeadServiceContext) {
  if (context.role !== WorkspaceRole.OWNER && context.role !== WorkspaceRole.ADMIN) {
    throw new ApiError(403, "INSUFFICIENT_ROLE", "Only workspace owners and admins can manage email sequences.");
  }
}

export async function listEmailSequences(database: PrismaClient, context: LeadServiceContext) {
  return database.emailSequence.findMany({
    where: { workspaceId: context.workspaceId, status: EmailSequenceStatus.DRAFT },
    include: { steps: { orderBy: { position: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createEmailSequence(database: PrismaClient, context: LeadServiceContext, input: EmailSequenceInput) {
  assertSequenceManager(context);
  return database.emailSequence.create({
    data: {
      workspaceId: context.workspaceId, name: input.name, description: input.description,
      steps: { create: input.steps.map((step, position) => ({ ...step, position })) },
    },
    include: { steps: { orderBy: { position: "asc" } } },
  });
}

export async function updateEmailSequence(database: PrismaClient, context: LeadServiceContext, sequenceId: string, input: UpdateEmailSequenceInput) {
  assertSequenceManager(context);
  const sequence = await database.emailSequence.findFirst({ where: { id: sequenceId, workspaceId: context.workspaceId, status: EmailSequenceStatus.DRAFT } });
  if (!sequence) throw new ApiError(404, "SEQUENCE_NOT_FOUND", "Email sequence was not found.");
  return database.$transaction(async (transaction) => {
    if (input.steps) {
      await transaction.emailStep.deleteMany({ where: { emailSequenceId: sequence.id } });
      if (input.steps.length) await transaction.emailStep.createMany({ data: input.steps.map((step, position) => ({ ...step, position, emailSequenceId: sequence.id })) });
    }
    return transaction.emailSequence.update({
      where: { id: sequence.id },
      data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description } : {}) },
      include: { steps: { orderBy: { position: "asc" } } },
    });
  });
}

export async function archiveEmailSequence(database: PrismaClient, context: LeadServiceContext, sequenceId: string) {
  assertSequenceManager(context);
  const result = await database.emailSequence.updateMany({ where: { id: sequenceId, workspaceId: context.workspaceId, status: EmailSequenceStatus.DRAFT }, data: { status: EmailSequenceStatus.ARCHIVED } });
  if (!result.count) throw new ApiError(404, "SEQUENCE_NOT_FOUND", "Email sequence was not found.");
  return { archived: true };
}
