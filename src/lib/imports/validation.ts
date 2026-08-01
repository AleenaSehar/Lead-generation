import { z } from "zod";

const headerName = z.string().trim().min(1).max(200);

export const importMappingSchema = z
  .object({
    email: headerName,
    firstName: headerName.optional(),
    lastName: headerName.optional(),
    phone: headerName.optional(),
    jobTitle: headerName.optional(),
    companyName: headerName.optional(),
    companyDomain: headerName.optional(),
    score: headerName.optional(),
    status: headerName.optional(),
  })
  .strict();

export const csvImportSchema = z
  .object({
    rows: z
      .array(z.record(z.string().max(200), z.string().max(2000)))
      .min(1)
      .max(1000),
    mapping: importMappingSchema,
    duplicateStrategy: z.enum(["SKIP", "UPDATE"]).default("SKIP"),
  })
  .strict();

export type CsvImportInput = z.infer<typeof csvImportSchema>;
