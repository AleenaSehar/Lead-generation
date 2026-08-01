import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import {
  LeadActivityType,
  LeadStatus,
  type WorkspaceRole,
} from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import { assertLeadPermission } from "@/lib/leads/permissions";
import { calculateLeadScore } from "@/lib/scoring/service";
import type {
  CreateLeadInput,
  LeadListQuery,
  UpdateLeadInput,
} from "@/lib/leads/validation";

export interface LeadServiceContext {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

function jsonValue(value: Record<string, unknown> | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

export async function listLeads(
  database: PrismaClient,
  context: LeadServiceContext,
  query: LeadListQuery,
) {
  assertLeadPermission(context.role, "read");

  const where: Prisma.LeadWhereInput = {
    workspaceId: context.workspaceId,
    ...(query.status ? { status: query.status } : { status: { not: LeadStatus.ARCHIVED } }),
    ...(query.source ? { source: query.source } : {}),
    ...(query.minScore !== undefined ? { score: { gte: query.minScore } } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { companyName: { contains: query.search, mode: "insensitive" } },
            { companyDomain: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const activeWhere: Prisma.LeadWhereInput = {
    workspaceId: context.workspaceId,
    status: { not: LeadStatus.ARCHIVED },
  };
  const [leads, total, statusCounts, sourceCounts] = await Promise.all([
    database.lead.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    database.lead.count({ where }),
    database.lead.groupBy({
      by: ["status"],
      where: activeWhere,
      orderBy: { status: "asc" },
      _count: { id: true },
    }),
    database.lead.groupBy({
      by: ["source"],
      where: activeWhere,
      orderBy: { source: "asc" },
      _count: { id: true },
    }),
  ]);

  const byStatus = Object.fromEntries(
    statusCounts.map((item) => [item.status, item._count.id]),
  ) as Partial<Record<LeadStatus, number>>;
  const activeTotal = statusCounts.reduce((sum, item) => sum + item._count.id, 0);

  return {
    data: leads,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
    summary: {
      total: activeTotal,
      qualified: byStatus[LeadStatus.QUALIFIED] ?? 0,
      converted: byStatus[LeadStatus.CONVERTED] ?? 0,
      byStatus,
      bySource: Object.fromEntries(
        sourceCounts.map((item) => [item.source, item._count.id]),
      ),
    },
  };
}

export async function getLead(
  database: PrismaClient,
  context: LeadServiceContext,
  leadId: string,
) {
  assertLeadPermission(context.role, "read");
  const lead = await database.lead.findFirst({
    where: { id: leadId, workspaceId: context.workspaceId },
    include: {
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 50,
      },
    },
  });
  if (!lead) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  return lead;
}

export async function createLead(
  database: PrismaClient,
  context: LeadServiceContext,
  input: CreateLeadInput,
) {
  assertLeadPermission(context.role, "create");
  const now = new Date();
  const rules = await database.scoringRule.findMany({ where: { workspaceId: context.workspaceId, isActive: true }, orderBy: { position: "asc" } });
  const scoring = calculateLeadScore({
    source: input.source, status: input.status, jobTitle: input.jobTitle ?? null,
    companyName: input.companyName ?? null, companyDomain: input.companyDomain ?? null,
    email: input.email ?? null, phone: input.phone ?? null,
    consentAt: input.consentAt ? new Date(input.consentAt) : null,
  }, rules);

  return database.$transaction(async (transaction) => {
    const lead = await transaction.lead.create({
      data: {
        workspaceId: context.workspaceId,
        ownerId: context.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        jobTitle: input.jobTitle,
        companyName: input.companyName,
        companyDomain: input.companyDomain,
        status: input.status,
        source: input.source,
        score: rules.length ? scoring.score : input.score,
        scoreDetails: rules.length ? scoring.details : undefined,
        consentAt: input.consentAt ? new Date(input.consentAt) : null,
        consentSource: input.consentSource,
        customFields: jsonValue(input.customFields),
        lastActivityAt: now,
      },
    });

    await transaction.leadActivity.create({
      data: {
        workspaceId: context.workspaceId,
        leadId: lead.id,
        actorId: context.userId,
        type: LeadActivityType.CREATED,
        summary: "Lead created.",
        metadata: { source: lead.source },
        occurredAt: now,
      },
    });

    return lead;
  });
}

export async function updateLead(
  database: PrismaClient,
  context: LeadServiceContext,
  leadId: string,
  input: UpdateLeadInput,
) {
  assertLeadPermission(context.role, "update");
  const current = await database.lead.findFirst({
    where: { id: leadId, workspaceId: context.workspaceId },
  });
  if (!current) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");

  const now = new Date();
  const rules = await database.scoringRule.findMany({ where: { workspaceId: context.workspaceId, isActive: true }, orderBy: { position: "asc" } });
  const scoring = calculateLeadScore({
    source: input.source ?? current.source, status: input.status ?? current.status,
    jobTitle: input.jobTitle === undefined ? current.jobTitle : input.jobTitle,
    companyName: input.companyName === undefined ? current.companyName : input.companyName,
    companyDomain: input.companyDomain === undefined ? current.companyDomain : input.companyDomain,
    email: input.email === undefined ? current.email : input.email,
    phone: input.phone === undefined ? current.phone : input.phone,
    consentAt: input.consentAt === undefined ? current.consentAt : input.consentAt ? new Date(input.consentAt) : null,
  }, rules);
  const nextScore = rules.length ? scoring.score : input.score;
  return database.$transaction(async (transaction) => {
    const data: Prisma.LeadUpdateInput = {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.companyDomain !== undefined ? { companyDomain: input.companyDomain } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(nextScore !== undefined ? { score: nextScore } : {}),
      ...(rules.length ? { scoreDetails: scoring.details as Prisma.InputJsonValue } : {}),
      ...(input.consentAt !== undefined
        ? { consentAt: input.consentAt ? new Date(input.consentAt) : null }
        : {}),
      ...(input.consentSource !== undefined ? { consentSource: input.consentSource } : {}),
      ...(input.customFields !== undefined ? { customFields: jsonValue(input.customFields) } : {}),
      lastActivityAt: now,
    };
    const updated = await transaction.lead.update({
      where: { id: current.id },
      data,
    });

    const activities: Prisma.LeadActivityCreateManyInput[] = [
      {
        workspaceId: context.workspaceId,
        leadId: current.id,
        actorId: context.userId,
        type: LeadActivityType.UPDATED,
        summary: "Lead details updated.",
        metadata: { fields: Object.keys(input) },
        occurredAt: now,
      },
    ];

    if (input.status && input.status !== current.status) {
      activities.push({
        workspaceId: context.workspaceId,
        leadId: current.id,
        actorId: context.userId,
        type: LeadActivityType.STATUS_CHANGED,
        summary: `Lead status changed from ${current.status} to ${input.status}.`,
        metadata: { from: current.status, to: input.status },
        occurredAt: now,
      });
    }
    if (nextScore !== undefined && nextScore !== current.score) {
      activities.push({
        workspaceId: context.workspaceId,
        leadId: current.id,
        actorId: context.userId,
        type: LeadActivityType.SCORE_CHANGED,
        summary: `Lead score changed from ${current.score} to ${nextScore}.`,
        metadata: { from: current.score, to: nextScore, matchedRules: rules.length ? scoring.details.matchedRules : undefined },
        occurredAt: now,
      });
    }

    await transaction.leadActivity.createMany({ data: activities });
    return updated;
  });
}

export async function archiveLead(
  database: PrismaClient,
  context: LeadServiceContext,
  leadId: string,
) {
  assertLeadPermission(context.role, "archive");
  const current = await database.lead.findFirst({
    where: { id: leadId, workspaceId: context.workspaceId },
  });
  if (!current) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  if (current.status === LeadStatus.ARCHIVED) return current;

  const now = new Date();
  return database.$transaction(async (transaction) => {
    const lead = await transaction.lead.update({
      where: { id: current.id },
      data: { status: LeadStatus.ARCHIVED, lastActivityAt: now },
    });
    await transaction.leadActivity.create({
      data: {
        workspaceId: context.workspaceId,
        leadId: current.id,
        actorId: context.userId,
        type: LeadActivityType.STATUS_CHANGED,
        summary: "Lead archived.",
        metadata: { from: current.status, to: LeadStatus.ARCHIVED },
        occurredAt: now,
      },
    });
    return lead;
  });
}
