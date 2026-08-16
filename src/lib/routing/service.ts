import type { PrismaClient } from "@/generated/prisma/client";
import { LeadActivityType, NotificationType, WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { LeadServiceContext } from "@/lib/leads/service";
import { assertLeadPermission } from "@/lib/leads/permissions";
import { createNotification } from "@/lib/notifications/service";
import type { AssignmentInput, RoutingRuleInput, RoutingSettingsInput } from "@/lib/routing/validation";

function assertCanConfigure(context: LeadServiceContext) {
  if (context.role !== WorkspaceRole.OWNER && context.role !== WorkspaceRole.ADMIN) throw new ApiError(403, "FORBIDDEN", "Only workspace owners and admins can change routing settings.");
}

export async function getRoutingOverview(database: PrismaClient, context: LeadServiceContext) {
  assertLeadPermission(context.role, "read");
  const [workspace, members, rules] = await Promise.all([
    database.workspace.findUniqueOrThrow({ where: { id: context.workspaceId }, select: { routingMode: true } }),
    database.workspaceMember.findMany({
      where: { workspaceId: context.workspaceId, role: { not: WorkspaceRole.VIEWER } },
      include: { user: { select: { id: true, name: true, email: true, imageUrl: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    database.leadRoutingRule.findMany({ where: { workspaceId: context.workspaceId }, include: { owner: { select: { id: true, name: true, email: true } } }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
  ]);
  return { mode: workspace.routingMode, members: members.map(({ role, user }) => ({ ...user, role })), rules };
}

export async function updateRoutingSettings(database: PrismaClient, context: LeadServiceContext, input: RoutingSettingsInput) {
  assertCanConfigure(context);
  return database.workspace.update({ where: { id: context.workspaceId }, data: { routingMode: input.mode, routingCursor: 0 }, select: { routingMode: true } });
}

export async function createRoutingRule(database: PrismaClient, context: LeadServiceContext, input: RoutingRuleInput) {
  assertCanConfigure(context);
  const membership = await database.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: context.workspaceId, userId: input.ownerId } } });
  if (!membership || membership.role === WorkspaceRole.VIEWER) throw new ApiError(400, "INVALID_LEAD_OWNER", "Choose a workspace member who can manage leads.");
  const count = await database.leadRoutingRule.count({ where: { workspaceId: context.workspaceId } });
  return database.leadRoutingRule.create({ data: { workspaceId: context.workspaceId, ownerId: input.ownerId, name: input.name, type: input.type, source: input.type === "SOURCE" ? input.source : null, minScore: input.type === "MIN_SCORE" ? input.minScore : null, position: count } });
}

export async function deleteRoutingRule(database: PrismaClient, context: LeadServiceContext, ruleId: string) {
  assertCanConfigure(context);
  const deleted = await database.leadRoutingRule.deleteMany({ where: { id: ruleId, workspaceId: context.workspaceId } });
  if (!deleted.count) throw new ApiError(404, "ROUTING_RULE_NOT_FOUND", "Routing rule was not found.");
  return { id: ruleId };
}

export async function assignLead(database: PrismaClient, context: LeadServiceContext, leadId: string, input: AssignmentInput) {
  assertLeadPermission(context.role, "update");
  const [lead, membership] = await Promise.all([
    database.lead.findFirst({ where: { id: leadId, workspaceId: context.workspaceId }, include: { owner: { select: { name: true, email: true } } } }),
    input.ownerId ? database.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: context.workspaceId, userId: input.ownerId } }, include: { user: { select: { id: true, name: true, email: true } } } }) : null,
  ]);
  if (!lead) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  if (input.ownerId && (!membership || membership.role === WorkspaceRole.VIEWER)) {
    throw new ApiError(400, "INVALID_LEAD_OWNER", "Choose an active workspace member who can manage leads.");
  }
  if (lead.ownerId === input.ownerId) return lead;

  const now = new Date();
  const previousOwner = lead.owner?.name ?? lead.owner?.email ?? "Unassigned";
  const nextOwner = membership?.user.name ?? membership?.user.email ?? "Unassigned";
  return database.$transaction(async (transaction) => {
    const updated = await transaction.lead.update({ where: { id: lead.id }, data: { ownerId: input.ownerId, lastActivityAt: now }, include: { owner: { select: { id: true, name: true, email: true, imageUrl: true } } } });
    await transaction.leadActivity.create({ data: { workspaceId: context.workspaceId, leadId, actorId: context.userId, type: LeadActivityType.ASSIGNED, summary: `Lead ownership changed from ${previousOwner} to ${nextOwner}.`, metadata: { fromOwnerId: lead.ownerId, toOwnerId: input.ownerId }, occurredAt: now } });
    if (input.ownerId && input.ownerId !== context.userId) {
      const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email || "A lead";
      await createNotification(transaction, { workspaceId: context.workspaceId, leadId, recipientId: input.ownerId, type: NotificationType.LEAD_ASSIGNED, title: "Lead assigned to you", message: `${leadName} is now your responsibility.`, dedupeKey: `lead-assigned:${leadId}:${input.ownerId}:${now.toISOString()}` });
    }
    return updated;
  });
}
