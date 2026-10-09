import { z } from "zod";
import { FONT_KEYS } from "@/lib/fonts";
import {
  booleanField,
  emptyToNull,
  hexColor,
  localDateTime,
  optionalImageUrl,
  optionalLocalDateTime,
  optionalText,
  phoneField,
  timezoneField,
} from "./common";

/**
 * One schema shared by the client form (react-hook-form + zodResolver) and the
 * API route. The route never trusts the client's copy — it re-parses the body —
 * but sharing the definition means the two can't drift.
 */

export const themeSchema = z.object({
  primaryColor: hexColor.default("#7C3AED"),
  secondaryColor: hexColor.default("#EC4899"),
  backgroundColor: hexColor.default("#FAF5FF"),
  surfaceColor: hexColor.default("#FFFFFF"),
  textColor: hexColor.default("#1F1235"),
  bodyFont: z.enum(FONT_KEYS).default("inter"),
  headingFont: z.enum(FONT_KEYS).default("playfair"),
  buttonStyle: z.enum(["SOLID", "OUTLINE", "SOFT"]).default("SOLID"),
  buttonShape: z.enum(["SQUARE", "ROUNDED", "PILL"]).default("ROUNDED"),
  logoUrl: optionalImageUrl,
  bannerImageUrl: optionalImageUrl,
});

export type ThemeInput = z.infer<typeof themeSchema>;

export const eventDetailsSchema = z
  .object({
    title: z.string().trim().min(2, "Give the event a title").max(120),
    description: optionalText(5000, "Description"),

    startsAtLocal: localDateTime,
    endsAtLocal: optionalLocalDateTime,
    timezone: timezoneField.default("Europe/Oslo"),

    locationName: optionalText(160, "Venue name"),
    locationAddress: optionalText(300, "Address"),
    locationUrl: emptyToNull(z.string().trim().url("Must be a full URL").max(2048)),

    contactName: optionalText(120, "Contact name"),
    contactEmail: emptyToNull(z.string().trim().email("Enter a valid email").max(254)),
    contactPhone: phoneField,

    rsvpDeadlineLocal: optionalLocalDateTime,
    maxGuests: emptyToNull(
      z.coerce.number().int("Must be a whole number").min(1, "Must be at least 1").max(100_000),
    ),
    maxAttendeesPerRsvp: z.coerce.number().int().min(1).max(50).default(5),

    preventDuplicateEmails: booleanField(true),
    allowRsvpUpdates: booleanField(true),
    collectPhone: booleanField(true),
    collectDietary: booleanField(true),
    collectMessage: booleanField(true),
    showCountdown: booleanField(true),

    notifyOnRsvp: booleanField(true),
    notifyEmail: emptyToNull(z.string().trim().email("Enter a valid email").max(254)),

    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  })
  // Cross-field rules live here rather than in the service so the form can show
  // them inline against the right input.
  .refine((v) => !v.endsAtLocal || v.endsAtLocal > v.startsAtLocal, {
    message: "The end time must be after the start time",
    path: ["endsAtLocal"],
  })
  .refine((v) => !v.rsvpDeadlineLocal || v.rsvpDeadlineLocal <= v.startsAtLocal, {
    message: "The RSVP deadline must be on or before the event starts",
    path: ["rsvpDeadlineLocal"],
  });

export type EventDetailsInput = z.infer<typeof eventDetailsSchema>;

export const createEventSchema = z.object({
  title: z.string().trim().min(2, "Give the event a title").max(120),
  startsAtLocal: localDateTime,
  timezone: timezoneField.default("Europe/Oslo"),
  /** Optional custom URL segment; auto-derived from the title when omitted. */
  slug: emptyToNull(
    z
      .string()
      .trim()
      .min(3, "At least 3 characters")
      .max(60)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  ),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/** Reserved so an event slug can never shadow an application route. */
export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "dashboard",
  "login",
  "logout",
  "register",
  "event",
  "events",
  "new",
  "settings",
  "static",
  "_next",
  "uploads",
]);
