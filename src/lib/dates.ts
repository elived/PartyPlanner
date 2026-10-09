import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Every timestamp is stored as a UTC instant. The organiser's chosen IANA zone
 * lives alongside it on the event, and is the *only* thing used for display.
 *
 * This matters: a guest in Tokyo opening an invitation for a party in Oslo must
 * see the Oslo wall-clock time, not their own. Rendering through the event's
 * zone on the server also keeps the markup identical between server and client,
 * which a naive `toLocaleString()` would not.
 */

/** `"2027-06-12T18:00"` as typed in the admin form + zone → UTC instant. */
export function localInputToUtc(local: string, timeZone: string): Date {
  return fromZonedTime(local, timeZone);
}

/** UTC instant → the `"2027-06-12T18:00"` string a datetime-local input expects. */
export function utcToLocalInput(date: Date | null | undefined, timeZone: string): string {
  if (!date) return "";
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm");
}

export function formatEventDate(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "EEEE d MMMM yyyy");
}

export function formatEventTime(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "HH:mm");
}

export function formatDateTime(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "d MMM yyyy 'at' HH:mm");
}

/** Short, unambiguous zone label, e.g. "CEST". */
export function timeZoneAbbreviation(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "zzz");
}

/** ISO 8601 with offset — what calendar links and <time dateTime> want. */
export function toIsoWithOffset(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/** Compact UTC stamp for Google Calendar / ICS: 20270612T160000Z */
export function toCalendarStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function isPast(date: Date | null | undefined): boolean {
  return Boolean(date && date.getTime() < Date.now());
}

/** Local midnight of `date` in `timeZone`, useful for "is it today" checks. */
export function startOfDayInZone(date: Date, timeZone: string): Date {
  const zoned = toZonedTime(date, timeZone);
  zoned.setHours(0, 0, 0, 0);
  return fromZonedTime(zoned, timeZone);
}

/** A trimmed list of zones for the admin picker, with the full IANA list as fallback. */
export function supportedTimeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? (Intl.supportedValuesOf("timeZone") as string[])
      : [];
  return supported.length > 0
    ? supported
    : ["Europe/Oslo", "Europe/London", "Europe/Berlin", "America/New_York", "UTC"];
}
