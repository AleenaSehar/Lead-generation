import { z } from "zod";
const property = z.string().trim().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use a valid CRM property name.");
export const crmConnectionSchema = z.object({ displayName: z.string().trim().min(2).max(80), isActive: z.boolean(), fieldMapping: z.object({ email: property, firstName: property, lastName: property, phone: property, jobTitle: property, companyName: property, companyDomain: property, status: property, score: property }).strict() }).strict();
export type CrmConnectionInput = z.infer<typeof crmConnectionSchema>;
