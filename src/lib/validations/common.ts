import { z } from "zod";

/**
 * HTML forms submit empty inputs as `""`, never as `undefined`. These helpers
 * normalise that to `null` once, at the edge, so the rest of the app only ever
 * deals with "a value" or "no value".
 */

export const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
    schema.nullable(),
  );

export const optionalText = (max: number, label = "This field") =>
  emptyToNull(z.string().trim().max(max, `${label} must be at most ${max} characters`));

/** Accepts http(s) URLs and site-relative paths (our own /uploads/... files). */
export const optionalImageUrl = emptyToNull(
  z
    .string()
    .trim()
    .max(2048)
    .refine(
      (v) => /^https?:\/\//i.test(v) || v.startsWith("/"),
      "Must be an https:// URL or an uploaded file",
    ),
);

/** `2027-06-12T18:00` as typed into <input type="datetime-local">. */
export const localDateTime = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
    "Use the date picker to choose a date and time",
  );

export const optionalLocalDateTime = emptyToNull(localDateTime);

export const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex colour such as #7C3AED")
  .transform((v) => v.toUpperCase());

export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254)
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

/**
 * `z.coerce.boolean()` is a trap for form input — it uses JS truthiness, so the
 * string "false" (and an unchecked checkbox's "off") would both become `true`.
 * This accepts the values HTML forms and JSON bodies actually produce.
 */
export const booleanField = (fallback: boolean) =>
  z.preprocess((v) => {
    if (typeof v === "boolean") return v;
    if (v == null || v === "") return fallback;
    if (typeof v === "string") return ["true", "on", "1", "yes"].includes(v.toLowerCase());
    return Boolean(v);
  }, z.boolean());

/** Loose on purpose: international numbers vary far too much to validate strictly. */
export const phoneField = emptyToNull(
  z
    .string()
    .trim()
    .max(32)
    .regex(/^[\d\s+()./-]{5,32}$/, "Enter a valid phone number"),
);

export const timezoneField = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone");

/** Flatten a ZodError into `{ fieldPath: message }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
