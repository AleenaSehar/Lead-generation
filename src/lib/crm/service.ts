import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { CrmProviderType, CrmSyncStatus, LeadActivityType, WorkspaceRole } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import { getCrmProvider } from "@/lib/crm/config";
import type { CrmContactPayload, CrmProvider } from "@/lib/crm/provider";
import type { CrmConnectionInput } from "@/lib/crm/validation";
import { assertLeadPermission } from "@/lib/leads/permissions";
import type { LeadServiceContext } from "@/lib/leads/service";

export const defaultCrmFieldMapping = { email: "email", firstName: "firstname", lastName: "lastname", phone: "phone", jobTitle: "jobtitle", companyName: "company", companyDomain: "website", status: "", score: "" };
function assertManager(context: LeadServiceContext) { if (context.role !== WorkspaceRole.OWNER && context.role !== WorkspaceRole.ADMIN) throw new ApiError(403, "INSUFFICIENT_ROLE", "Only workspace owners and admins can configure CRM synchronization."); }

export async function getCrmConnection(database: PrismaClient, context: LeadServiceContext) { return database.crmConnection.findUnique({ where: { workspaceId: context.workspaceId }, include: { _count: { select: { contactLinks: true, syncAttempts: true } } } }); }
export async function saveCrmConnection(database: PrismaClient, context: LeadServiceContext, input: CrmConnectionInput) { assertManager(context); if (input.provider === CrmProviderType.HUBSPOT) { getCrmProvider(input.provider); if (input.fieldMapping.email !== "email") throw new ApiError(400, "HUBSPOT_EMAIL_MAPPING_REQUIRED", "HubSpot synchronization requires the LeadFlow email field to map to email."); } return database.crmConnection.upsert({ where: { workspaceId: context.workspaceId }, create: { workspaceId: context.workspaceId, ...input }, update: input }); }
export async function testCrmConnection(database: PrismaClient, context: LeadServiceContext) { assertManager(context); const connection = await database.crmConnection.findUnique({ where: { workspaceId: context.workspaceId } }); if (!connection) throw new ApiError(409, "CRM_CONNECTION_REQUIRED", "Save a CRM connection first."); const result = await getCrmProvider(connection.provider).testConnection(); const tested = await database.crmConnection.update({ where: { id: connection.id }, data: { lastTestedAt: new Date() } }); return { ...result, testedAt: tested.lastTestedAt }; }

function payloadForLead(lead: { email: string | null; firstName: string | null; lastName: string | null; phone: string | null; jobTitle: string | null; companyName: string | null; companyDomain: string | null; status: string; score: number }, mapping: typeof defaultCrmFieldMapping) {
  const values = { email: lead.email, firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone, jobTitle: lead.jobTitle, companyName: lead.companyName, companyDomain: lead.companyDomain, status: lead.status, score: lead.score };
  return Object.fromEntries(Object.entries(mapping).filter(([, target]) => Boolean(target)).map(([source, target]) => [target, values[source as keyof typeof values]])) as CrmContactPayload;
}

export async function syncLeadToCrm(database: PrismaClient, context: LeadServiceContext, leadId: string, providerOverride?: CrmProvider) {
  assertLeadPermission(context.role, "update");
  const [lead, connection] = await Promise.all([database.lead.findFirst({ where: { id: leadId, workspaceId: context.workspaceId } }), database.crmConnection.findUnique({ where: { workspaceId: context.workspaceId } })]);
  if (!lead) throw new ApiError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  if (!lead.email) throw new ApiError(409, "CRM_EMAIL_REQUIRED", "An email address is required to synchronize this lead.");
  if (!connection?.isActive) throw new ApiError(409, "CRM_CONNECTION_INACTIVE", "Configure and enable the CRM connection first.");
  const mapping = connection.fieldMapping as typeof defaultCrmFieldMapping; const payload = payloadForLead(lead, mapping);
  const key = createHash("sha256").update(`${connection.id}:${connection.updatedAt.toISOString()}:${lead.id}:${lead.updatedAt.toISOString()}`).digest("hex");
  const existingAttempt = await database.crmSyncAttempt.findUnique({ where: { idempotencyKey: key } });
  if (existingAttempt?.status === CrmSyncStatus.COMPLETED) return { attempt: existingAttempt, duplicate: true, link: await database.crmContactLink.findUnique({ where: { connectionId_leadId: { connectionId: connection.id, leadId: lead.id } } }) };
  let attempt = existingAttempt;
  if (!attempt) try { attempt = await database.crmSyncAttempt.create({ data: { workspaceId: context.workspaceId, connectionId: connection.id, leadId: lead.id, initiatedById: context.userId, idempotencyKey: key, requestPayload: payload as Prisma.InputJsonValue } }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { attempt: await database.crmSyncAttempt.findUniqueOrThrow({ where: { idempotencyKey: key } }), duplicate: true, link: await database.crmContactLink.findUnique({ where: { connectionId_leadId: { connectionId: connection.id, leadId: lead.id } } }) }; throw error; }
  const currentLink = await database.crmContactLink.findUnique({ where: { connectionId_leadId: { connectionId: connection.id, leadId: lead.id } } });
  try {
    const result = await (providerOverride ?? getCrmProvider(connection.provider)).upsertContact({ payload, existingExternalId: currentLink?.externalId, idempotencyKey: key }); const now = result.acceptedAt;
    const [completed, link] = await database.$transaction([
      database.crmSyncAttempt.update({ where: { id: attempt.id }, data: { status: CrmSyncStatus.COMPLETED, completedAt: now, responsePayload: { provider: result.provider, externalId: result.externalId, operation: result.operation, acceptedAt: result.acceptedAt.toISOString() } } }),
      database.crmContactLink.upsert({ where: { connectionId_leadId: { connectionId: connection.id, leadId: lead.id } }, create: { workspaceId: context.workspaceId, connectionId: connection.id, leadId: lead.id, externalId: result.externalId, lastSyncedAt: now, sourceUpdatedAt: lead.updatedAt }, update: { externalId: result.externalId, lastSyncedAt: now, sourceUpdatedAt: lead.updatedAt } }),
      database.leadActivity.create({ data: { workspaceId: context.workspaceId, leadId: lead.id, actorId: context.userId, type: LeadActivityType.CRM_SYNCED, summary: `Lead ${result.operation} in ${connection.displayName}.`, occurredAt: now, metadata: { provider: result.provider, externalId: result.externalId, operation: result.operation } } }),
    ]);
    return { attempt: completed, link, duplicate: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CRM provider failed."; const now = new Date();
    const providerFailure = error as { status?: unknown; retryable?: unknown; retryAfterMs?: unknown };
    const responsePayload = { providerStatus: typeof providerFailure.status === "number" ? providerFailure.status : null, retryable: providerFailure.retryable === true, retryAfterMs: typeof providerFailure.retryAfterMs === "number" ? providerFailure.retryAfterMs : null };
    await database.$transaction([database.crmSyncAttempt.update({ where: { id: attempt.id }, data: { status: CrmSyncStatus.FAILED, completedAt: now, error: message, responsePayload } }), database.leadActivity.create({ data: { workspaceId: context.workspaceId, leadId: lead.id, actorId: context.userId, type: LeadActivityType.CRM_SYNC_FAILED, summary: `CRM synchronization failed: ${message}`, occurredAt: now, metadata: responsePayload } })]);
    throw new ApiError(502, "CRM_SYNC_FAILED", "The CRM provider could not synchronize this lead.");
  }
}

export async function listCrmSyncs(database: PrismaClient, context: LeadServiceContext) { return database.crmSyncAttempt.findMany({ where: { workspaceId: context.workspaceId }, include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, companyName: true } }, initiatedBy: { select: { name: true, email: true } } }, orderBy: { startedAt: "desc" }, take: 100 }); }
