import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { LeadActivityType, LeadStatus, NotificationType, ScoringRuleField, ScoringRuleOperator, WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { LeadServiceContext } from "@/lib/leads/service";
import { createNotification, HIGH_SCORE_THRESHOLD } from "@/lib/notifications/service";
import type { ScoringRuleInput, UpdateScoringRuleInput } from "@/lib/scoring/validation";

type Rule = { id: string; name: string; field: ScoringRuleField; operator: ScoringRuleOperator; value: string | null; points: number };
type ScorableLead = { source: string; status: string; jobTitle: string | null; companyName: string | null; companyDomain: string | null; email: string | null; phone: string | null; consentAt: Date | null };

function assertManager(context: LeadServiceContext) {
  if (context.role !== WorkspaceRole.OWNER && context.role !== WorkspaceRole.ADMIN) throw new ApiError(403, "FORBIDDEN", "Only workspace owners and admins can manage scoring rules.");
}

function fieldValue(lead: ScorableLead, field: ScoringRuleField) {
  const values: Record<ScoringRuleField, unknown> = {
    SOURCE: lead.source, STATUS: lead.status, JOB_TITLE: lead.jobTitle, COMPANY_NAME: lead.companyName,
    COMPANY_DOMAIN: lead.companyDomain, EMAIL: lead.email, PHONE: lead.phone, CONSENT: lead.consentAt,
  };
  return values[field];
}

export function calculateLeadScore(lead: ScorableLead, rules: Rule[]) {
  const matched = rules.filter((rule) => {
    const raw = fieldValue(lead, rule.field);
    const exists = raw !== null && raw !== undefined && String(raw).trim() !== "";
    if (rule.operator === ScoringRuleOperator.EXISTS) return exists;
    if (rule.operator === ScoringRuleOperator.NOT_EXISTS) return !exists;
    if (!exists) return false;
    const actual = String(raw).toLowerCase();
    const expected = (rule.value ?? "").toLowerCase();
    return rule.operator === ScoringRuleOperator.EQUALS ? actual === expected : actual.includes(expected);
  });
  const rawScore = matched.reduce((sum, rule) => sum + rule.points, 0);
  return { score: Math.max(0, Math.min(100, rawScore)), details: { version: 1, rawScore, matchedRules: matched.map(({ id, name, points }) => ({ id, name, points })) } };
}

export async function listScoringRules(database: PrismaClient, context: LeadServiceContext) {
  return database.scoringRule.findMany({ where: { workspaceId: context.workspaceId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
}

export async function createScoringRule(database: PrismaClient, context: LeadServiceContext, input: ScoringRuleInput) {
  assertManager(context);
  const position = await database.scoringRule.count({ where: { workspaceId: context.workspaceId } });
  return database.scoringRule.create({ data: { ...input, workspaceId: context.workspaceId, position } });
}

export async function updateScoringRule(database: PrismaClient, context: LeadServiceContext, id: string, input: UpdateScoringRuleInput) {
  assertManager(context);
  const result = await database.scoringRule.updateMany({ where: { id, workspaceId: context.workspaceId }, data: input });
  if (!result.count) throw new ApiError(404, "RULE_NOT_FOUND", "Scoring rule was not found.");
  return database.scoringRule.findUniqueOrThrow({ where: { id } });
}

export async function deleteScoringRule(database: PrismaClient, context: LeadServiceContext, id: string) {
  assertManager(context);
  const result = await database.scoringRule.deleteMany({ where: { id, workspaceId: context.workspaceId } });
  if (!result.count) throw new ApiError(404, "RULE_NOT_FOUND", "Scoring rule was not found.");
}

export async function recalculateWorkspaceScores(database: PrismaClient, context: LeadServiceContext) {
  assertManager(context);
  const [rules, leads] = await Promise.all([
    database.scoringRule.findMany({ where: { workspaceId: context.workspaceId, isActive: true }, orderBy: { position: "asc" } }),
    database.lead.findMany({
      where: { workspaceId: context.workspaceId, status: { not: LeadStatus.ARCHIVED } },
    }),
  ]);
  let changed = 0;
  for (const lead of leads) {
    const result = calculateLeadScore(lead, rules);
    if (result.score === lead.score && JSON.stringify(result.details) === JSON.stringify(lead.scoreDetails)) continue;
    await database.$transaction(async (tx) => {
      const updated = await tx.lead.update({ where: { id: lead.id }, data: { score: result.score, scoreDetails: result.details as Prisma.InputJsonValue } });
      await tx.leadActivity.create({ data: { workspaceId: context.workspaceId, leadId: lead.id, actorId: context.userId, type: LeadActivityType.SCORE_CHANGED, summary: `Lead score recalculated from ${lead.score} to ${result.score}.`, metadata: { from: lead.score, to: result.score, matchedRules: result.details.matchedRules } } });
      if (result.score >= HIGH_SCORE_THRESHOLD && lead.score < HIGH_SCORE_THRESHOLD) { const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email || "A lead"; await createNotification(tx, { workspaceId: context.workspaceId, leadId: lead.id, type: NotificationType.HIGH_SCORE, title: "High-score lead", message: `${name} reached a score of ${result.score}.`, dedupeKey: `high-score:${lead.id}:${updated.updatedAt.toISOString()}`, metadata: { score: result.score, threshold: HIGH_SCORE_THRESHOLD } }); }
    });
    changed++;
  }
  return { total: leads.length, changed };
}
