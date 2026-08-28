import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { LeadActivityType } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import { assertLeadPermission } from "@/lib/leads/permissions";
import type { LeadServiceContext } from "@/lib/leads/service";
import { getLeadInsightProvider } from "@/lib/ai/config";
import { GroqProviderError } from "@/lib/ai/groq-provider";
import type { LeadInsightInput } from "@/lib/ai/provider";

function toInsightInput(lead: { firstName: string | null; lastName: string | null; jobTitle: string | null; companyName: string | null; companyDomain: string | null; source: string; status: string; score: number; consentAt: Date | null }): LeadInsightInput {
  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    jobTitle: lead.jobTitle,
    companyName: lead.companyName,
    companyDomain: lead.companyDomain,
    source: lead.source,
    status: lead.status,
    ruleScore: lead.score,
    hasConsent: lead.consentAt !== null,
  };
}

export async function generateLeadInsight(database: PrismaClient, context: LeadServiceContext, leadId: string) {
  assertLeadPermission(context.role, "update");
  const lead = await database.lead.findFirst({ where: { id: leadId, workspaceId: context.workspaceId } });
  if (!lead) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");

  const provider = getLeadInsightProvider();
  let result;
  try {
    result = await provider.generate(toInsightInput(lead));
  } catch (error) {
    if (error instanceof GroqProviderError) throw new ApiError(error.status, "AI_PROVIDER_ERROR", error.message);
    throw error;
  }

  const now = new Date();
  return database.$transaction(async (transaction) => {
    const updated = await transaction.lead.update({ where: { id: leadId }, data: { aiInsight: result as unknown as Prisma.InputJsonValue, aiInsightGeneratedAt: now } });
    await transaction.leadActivity.create({ data: { workspaceId: context.workspaceId, leadId, actorId: context.userId, type: LeadActivityType.AI_INSIGHT_GENERATED, summary: `AI insight generated (fit score ${result.fitScore}, via ${provider.name}).`, metadata: { provider: provider.name, fitScore: result.fitScore }, occurredAt: now } });
    return updated;
  });
}
