import type { PrismaClient } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { LeadActivityType } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import { getLeadInsightProvider } from "@/lib/ai/config";
import { GroqProviderError } from "@/lib/ai/groq-provider";
import type { LeadInsight } from "@/lib/ai/provider";
import { leadInsightSchema } from "@/lib/ai/validation";
import { assertLeadPermission } from "@/lib/leads/permissions";
import type { LeadServiceContext } from "@/lib/leads/service";

export async function generateLeadInsight(
  database: PrismaClient,
  context: LeadServiceContext,
  leadId: string,
) {
  assertLeadPermission(context.role, "update");
  const lead = await database.lead.findFirst({ where: { id: leadId, workspaceId: context.workspaceId } });
  if (!lead) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");

  let insight: LeadInsight;
  try {
    insight = await getLeadInsightProvider().generateInsight({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      jobTitle: lead.jobTitle,
      companyName: lead.companyName,
      companyDomain: lead.companyDomain,
      status: lead.status,
      source: lead.source,
      score: lead.score,
      scoreDetails: lead.scoreDetails,
      consentAt: lead.consentAt,
      lastActivityAt: lead.lastActivityAt,
    });
  } catch (error) {
    if (error instanceof GroqProviderError) throw new ApiError(error.status, "AI_INSIGHT_FAILED", error.message);
    throw error;
  }
  const validated = leadInsightSchema.parse(insight);

  const now = new Date();
  return database.$transaction(async (transaction) => {
    const updated = await transaction.lead.update({
      where: { id: leadId },
      data: { aiInsight: validated as Prisma.InputJsonValue, aiInsightGeneratedAt: now },
    });
    await transaction.leadActivity.create({
      data: {
        workspaceId: context.workspaceId,
        leadId,
        actorId: context.userId,
        type: LeadActivityType.AI_INSIGHT_GENERATED,
        summary: `AI lead insight generated (fit score ${validated.fitScore}).`,
        metadata: { fitScore: validated.fitScore },
        occurredAt: now,
      },
    });
    return updated;
  });
}
