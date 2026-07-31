import type { PrismaClient } from "@/generated/prisma/client";
import { LeadActivityType, LeadSourceType, LeadStatus } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { LeadServiceContext } from "@/lib/leads/service";
import type { CsvImportInput } from "./validation";

interface ImportRow {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  companyName?: string;
  companyDomain?: string;
  score?: number;
  status?: LeadStatus;
}

function value(row: Record<string, string>, header?: string) {
  const result = header ? row[header]?.trim() : "";
  return result || undefined;
}

function mapRow(row: Record<string, string>, mapping: CsvImportInput["mapping"]): ImportRow {
  const email = value(row, mapping.email)?.toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("A valid mapped email is required.");
  const rawScore = value(row, mapping.score);
  const score = rawScore === undefined ? undefined : Number(rawScore);
  if (score !== undefined && (!Number.isInteger(score) || score < 0 || score > 100)) {
    throw new Error("Score must be a whole number from 0 to 100.");
  }
  const rawStatus = value(row, mapping.status)?.toUpperCase();
  if (rawStatus && !Object.values(LeadStatus).includes(rawStatus as LeadStatus)) {
    throw new Error(`Unknown status “${rawStatus}”.`);
  }
  return {
    email,
    firstName: value(row, mapping.firstName),
    lastName: value(row, mapping.lastName),
    phone: value(row, mapping.phone),
    jobTitle: value(row, mapping.jobTitle),
    companyName: value(row, mapping.companyName),
    companyDomain: value(row, mapping.companyDomain),
    score,
    status: rawStatus as LeadStatus | undefined,
  };
}

export async function importCsvLeads(
  database: PrismaClient,
  context: LeadServiceContext,
  input: CsvImportInput,
) {
  if (context.role === "VIEWER") {
    throw new ApiError(403, "INSUFFICIENT_ROLE", "Your workspace role cannot import leads.");
  }

  const result = {
    total: input.rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as { row: number; message: string }[],
  };

  for (const [index, rawRow] of input.rows.entries()) {
    try {
      const row = mapRow(rawRow, input.mapping);
      const existing = await database.lead.findUnique({
        where: { workspaceId_email: { workspaceId: context.workspaceId, email: row.email } },
      });
      if (existing && input.duplicateStrategy === "SKIP") {
        result.skipped += 1;
        continue;
      }

      await database.$transaction(async (transaction) => {
        const now = new Date();
        const lead = existing
          ? await transaction.lead.update({
              where: { id: existing.id },
              data: {
                ...(row.firstName ? { firstName: row.firstName } : {}),
                ...(row.lastName ? { lastName: row.lastName } : {}),
                ...(row.phone ? { phone: row.phone } : {}),
                ...(row.jobTitle ? { jobTitle: row.jobTitle } : {}),
                ...(row.companyName ? { companyName: row.companyName } : {}),
                ...(row.companyDomain ? { companyDomain: row.companyDomain } : {}),
                ...(row.score !== undefined ? { score: row.score } : {}),
                ...(row.status ? { status: row.status } : {}),
                lastActivityAt: now,
              },
            })
          : await transaction.lead.create({
              data: {
                ...row,
                workspaceId: context.workspaceId,
                ownerId: context.userId,
                source: LeadSourceType.CSV_IMPORT,
                lastActivityAt: now,
              },
            });
        await transaction.leadActivity.create({
          data: {
            workspaceId: context.workspaceId,
            leadId: lead.id,
            actorId: context.userId,
            type: existing ? LeadActivityType.UPDATED : LeadActivityType.CREATED,
            summary: existing ? "Lead updated by CSV import." : "Lead created by CSV import.",
            metadata: { import: "csv", row: index + 2 },
            occurredAt: now,
          },
        });
      });
      if (existing) result.updated += 1;
      else result.created += 1;
    } catch (error) {
      result.failed += 1;
      if (result.errors.length < 100) {
        result.errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : "Row could not be imported.",
        });
      }
    }
  }
  return result;
}
