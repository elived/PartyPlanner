import "server-only";
import type { Event, Rsvp } from "@prisma/client";
import * as XLSX from "xlsx";
import { formatDateTime } from "@/lib/dates";
import { RSVP_STATUS_LABELS, type RsvpStatusValue } from "@/lib/validations/rsvp";

/**
 * Both export formats are produced from one row-shaping function, so the CSV
 * and the workbook can never disagree about columns or ordering.
 */

const COLUMNS = [
  "Name",
  "Email",
  "Phone",
  "Response",
  "Attendees",
  "Dietary restrictions",
  "Message",
  "Submitted",
] as const;

type ExportableRsvp = Pick<
  Rsvp,
  | "name"
  | "email"
  | "phone"
  | "status"
  | "attendeesCount"
  | "dietaryRestrictions"
  | "message"
  | "createdAt"
>;

function toRow(rsvp: ExportableRsvp, timeZone: string): (string | number)[] {
  return [
    rsvp.name,
    rsvp.email,
    rsvp.phone ?? "",
    RSVP_STATUS_LABELS[rsvp.status as RsvpStatusValue],
    rsvp.attendeesCount,
    rsvp.dietaryRestrictions ?? "",
    rsvp.message ?? "",
    formatDateTime(rsvp.createdAt, timeZone),
  ];
}

export interface ExportInput {
  event: Pick<Event, "title" | "slug" | "timezone" | "startsAt">;
  rsvps: ExportableRsvp[];
}

/**
 * Excel treats a leading =, +, - or @ in a cell as a formula. A guest who names
 * themselves `=HYPERLINK(...)` would otherwise get code executing in the
 * organiser's spreadsheet — the CSV/formula-injection class of bug. Prefixing a
 * single quote makes Excel and Sheets treat the value as literal text.
 */
function neutralise(value: string | number): string | number {
  if (typeof value !== "string") return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function buildXlsx(input: ExportInput): Buffer {
  const { event, rsvps } = input;

  const summary = summarise(rsvps);
  const rows = rsvps.map((r) => toRow(r, event.timezone).map(neutralise));

  const sheet = XLSX.utils.aoa_to_sheet([[...COLUMNS], ...rows]);
  sheet["!cols"] = [
    { wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 14 },
    { wch: 10 }, { wch: 34 }, { wch: 46 }, { wch: 20 },
  ];
  // Freeze the header row so long guest lists stay readable.
  sheet["!freeze"] = { xSplit: "0", ySplit: "1", topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Event", event.title],
    ["Invitation", `/event/${event.slug}`],
    ["Starts", formatDateTime(event.startsAt, event.timezone)],
    ["Time zone", event.timezone],
    [],
    ["Responses", summary.total],
    ["Attending", summary.attending],
    ["Maybe", summary.maybe],
    ["Not attending", summary.notAttending],
    ["Expected head count", summary.expectedAttendees],
    [],
    ["Exported", formatDateTime(new Date(), event.timezone)],
  ]);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 46 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "RSVPs");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildCsv(input: ExportInput): string {
  const quote = (value: string | number) => {
    const s = String(neutralise(value));
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    COLUMNS.join(","),
    ...input.rsvps.map((r) => toRow(r, input.event.timezone).map(quote).join(",")),
  ];
  // BOM so Excel on Windows detects UTF-8 and renders å/æ/ø correctly.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export interface RsvpSummary {
  total: number;
  attending: number;
  notAttending: number;
  maybe: number;
  expectedAttendees: number;
}

export function summarise(rsvps: Pick<Rsvp, "status" | "attendeesCount">[]): RsvpSummary {
  return rsvps.reduce<RsvpSummary>(
    (acc, r) => {
      acc.total += 1;
      if (r.status === "ATTENDING") {
        acc.attending += 1;
        acc.expectedAttendees += r.attendeesCount;
      } else if (r.status === "NOT_ATTENDING") {
        acc.notAttending += 1;
      } else {
        acc.maybe += 1;
      }
      return acc;
    },
    { total: 0, attending: 0, notAttending: 0, maybe: 0, expectedAttendees: 0 },
  );
}

/** `john-birthday-2027-rsvps-2026-09-30.xlsx` */
export function exportFilename(slug: string, ext: "xlsx" | "csv"): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slug}-rsvps-${stamp}.${ext}`;
}
