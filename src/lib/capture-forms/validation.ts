import { z } from "zod";
import { CaptureFormStatus } from "@/generated/prisma/enums";

export const captureFormSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().nullable(),
    successMessage: z.string().trim().min(2).max(300).default("Thanks! We will be in touch soon."),
    status: z.enum(CaptureFormStatus).default(CaptureFormStatus.ACTIVE),
    collectFirstName: z.boolean().default(true),
    collectLastName: z.boolean().default(true),
    collectCompanyName: z.boolean().default(true),
    collectJobTitle: z.boolean().default(false),
    collectCompanyDomain: z.boolean().default(false),
    collectPhone: z.boolean().default(false),
    collectMessage: z.boolean().default(true),
    requireConsent: z.boolean().default(true),
    consentText: z
      .string()
      .trim()
      .min(5)
      .max(500)
      .default("I agree to be contacted about this request."),
  })
  .strict();

export const updateCaptureFormSchema = captureFormSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const publicSubmissionSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    firstName: z.string().trim().max(80).optional(),
    lastName: z.string().trim().max(80).optional(),
    companyName: z.string().trim().max(160).optional(),
    jobTitle: z.string().trim().max(120).optional(),
    companyDomain: z.string().trim().max(253).optional(),
    phone: z.string().trim().max(40).optional(),
    message: z.string().trim().max(2000).optional(),
    consent: z.boolean().default(false),
    website: z.string().max(0).optional(),
  })
  .strict();

export type CaptureFormInput = z.infer<typeof captureFormSchema>;
export type UpdateCaptureFormInput = z.infer<typeof updateCaptureFormSchema>;
export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>;
