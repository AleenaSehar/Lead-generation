import { z } from "zod";
import { CrmProviderType } from "@/generated/prisma/enums";
const property = z.string().trim().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use a valid CRM property name.");
const optionalProperty = z.union([property, z.literal("")]);
export const crmConnectionSchema = z.object({ provider: z.enum(CrmProviderType), displayName: z.string().trim().min(2).max(80), isActive: z.boolean(), fieldMapping: z.object({ email: property, firstName: optionalProperty, lastName: optionalProperty, phone: optionalProperty, jobTitle: optionalProperty, companyName: optionalProperty, companyDomain: optionalProperty, status: optionalProperty, score: optionalProperty }).strict() }).strict();
export type CrmConnectionInput = z.infer<typeof crmConnectionSchema>;
