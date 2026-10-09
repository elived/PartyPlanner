import { z } from "zod";
import { emailField, optionalText, phoneField } from "./common";

export const RSVP_STATUSES = ["ATTENDING", "NOT_ATTENDING", "MAYBE"] as const;
export type RsvpStatusValue = (typeof RSVP_STATUSES)[number];

export const RSVP_STATUS_LABELS: Record<RsvpStatusValue, string> = {
  ATTENDING: "Attending",
  NOT_ATTENDING: "Not attending",
  MAYBE: "Maybe",
};

/**
 * The public RSVP payload. `attendeesCount` is validated against the event's
 * own `maxAttendeesPerRsvp` in the service layer, because the ceiling is
 * per-event and this schema has to stay serialisable/shareable.
 */
export const rsvpSubmissionSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: emailField,
  phone: phoneField,
  status: z.enum(RSVP_STATUSES, {
    errorMap: () => ({ message: "Choose whether you can make it" }),
  }),
  attendeesCount: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .int("Enter a whole number")
    .min(0, "Cannot be negative")
    .max(50, "That is more guests than we can accept here")
    .default(1),
  dietaryRestrictions: optionalText(1000, "Dietary restrictions"),
  message: optionalText(2000, "Message"),
  /**
   * Honeypot. Real browsers leave it empty because it is visually hidden and
   * marked aria-hidden + tabindex=-1; naive bots fill every input they find.
   */
  website: z.string().max(0).optional().default(""),
});

export type RsvpSubmissionInput = z.input<typeof rsvpSubmissionSchema>;
export type RsvpSubmission = z.output<typeof rsvpSubmissionSchema>;

/** Query params for the admin RSVP table. */
export const rsvpQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z.enum(["ALL", ...RSVP_STATUSES]).optional().default("ALL"),
  sort: z.enum(["createdAt", "name", "attendeesCount"]).optional().default("createdAt"),
  dir: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(5).max(200).optional().default(25),
});

export type RsvpQuery = z.infer<typeof rsvpQuerySchema>;
