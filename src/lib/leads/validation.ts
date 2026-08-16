import { z } from "zod";
import { LeadSourceType, LeadStatus } from "@/generated/prisma/enums";

const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .nullable()
    .transform((value) => value || null);

const leadFieldsSchema = z.object({
  firstName: nullableText(80),
  lastName: nullableText(80),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  phone: nullableText(40),
  jobTitle: nullableText(120),
  companyName: nullableText(160),
  companyDomain: nullableText(253),
  status: z.enum(LeadStatus),
  source: z.enum(LeadSourceType),
  score: z.number().int().min(0).max(100),
  consentAt: z.iso.datetime().nullable(),
  consentSource: nullableText(160),
  customFields: z.record(z.string(), z.unknown()).nullable(),
});

export const createLeadSchema = leadFieldsSchema
  .partial()
  .required({ email: true })
  .extend({
    status: z.enum(LeadStatus).default(LeadStatus.NEW),
    source: z.enum(LeadSourceType).default(LeadSourceType.MANUAL),
    score: z.number().int().min(0).max(100).default(0),
  })
  .strict();

export const updateLeadSchema = leadFieldsSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(LeadStatus).optional(),
  source: z.enum(LeadSourceType).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  ownerId: z.union([z.string().cuid(), z.literal("unassigned")]).optional(),
  sort: z.enum(["createdAt", "updatedAt", "score", "lastActivityAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
});

export const leadNoteSchema = z.object({
  note: z.string().trim().min(1, "Enter a note.").max(2000),
}).strict();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type LeadNoteInput = z.infer<typeof leadNoteSchema>;
