import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const interval = z.object({ start: time, end: time }).refine((value) => value.end > value.start, { message: "End time must be after start time." });
export const availabilitySchema = z.record(z.enum(["0", "1", "2", "3", "4", "5", "6"]), z.array(interval).max(3));

export const bookingPageSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable(),
  durationMinutes: z.number().int().refine((value) => [15, 30, 45, 60].includes(value), "Choose a supported duration."),
  bufferMinutes: z.number().int().min(0).max(60),
  minimumNoticeHours: z.number().int().min(0).max(168),
  maximumAdvanceDays: z.number().int().min(1).max(180),
  timeZone: z.string().trim().min(1).max(100).refine((value) => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Invalid IANA time zone."),
  availability: availabilitySchema,
  isActive: z.boolean(),
}).strict();

export const publicBookingSchema = z.object({
  startAt: z.iso.datetime(),
  attendeeName: z.string().trim().min(2).max(100),
  attendeeEmail: z.email().trim().toLowerCase(),
  attendeeTimeZone: z.string().trim().min(1).max(100).refine((value) => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Invalid IANA time zone."),
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict();

export const bookingDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type BookingPageInput = z.infer<typeof bookingPageSchema>;
export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
