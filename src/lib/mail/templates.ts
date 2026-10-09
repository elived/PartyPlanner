import type { Event, Rsvp } from "@prisma/client";
import { formatDateTime } from "@/lib/dates";
import { RSVP_STATUS_LABELS, type RsvpStatusValue } from "@/lib/validations/rsvp";

/**
 * Hand-written HTML rather than a component renderer: notification mail is two
 * templates, and email clients need table layout + inline styles anyway. Every
 * interpolated value goes through `esc()` — an RSVP message is attacker-controlled
 * text arriving in the organiser's inbox.
 */

function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STATUS_COLOR: Record<RsvpStatusValue, string> = {
  ATTENDING: "#047857",
  NOT_ATTENDING: "#B91C1C",
  MAYBE: "#B45309",
};

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:24px;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F1235;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E9D5FF;">
<tr><td style="padding:24px 28px;">${bodyHtml}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#6B7280;text-align:center;">Sent by Party Planner</p>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6B7280;width:38%;vertical-align:top;">${esc(label)}</td>
    <td style="padding:6px 0;font-size:14px;color:#1F1235;vertical-align:top;">${value}</td>
  </tr>`;
}

export interface RsvpNotificationParams {
  event: Pick<Event, "title" | "slug" | "timezone" | "startsAt">;
  rsvp: Pick<
    Rsvp,
    "name" | "email" | "phone" | "status" | "attendeesCount" | "dietaryRestrictions" | "message" | "createdAt"
  >;
  /** Totals after this RSVP was saved, so the organiser gets the running picture. */
  totals: { attending: number; notAttending: number; maybe: number; expectedAttendees: number };
  dashboardUrl: string;
  isUpdate: boolean;
}

/** Notification to the organiser when a guest responds. */
export function rsvpNotificationEmail(p: RsvpNotificationParams) {
  const status = p.rsvp.status as RsvpStatusValue;
  const statusLabel = RSVP_STATUS_LABELS[status];
  const verb = p.isUpdate ? "updated their RSVP" : "responded";

  const subject = `${p.rsvp.name} — ${statusLabel} · ${p.event.title}`;

  const details = [
    row("Guest", esc(p.rsvp.name)),
    row(
      "Response",
      `<strong style="color:${STATUS_COLOR[status]};">${esc(statusLabel)}</strong>`,
    ),
    row("Attendees", String(p.rsvp.attendeesCount)),
    row("Email", `<a href="mailto:${esc(p.rsvp.email)}" style="color:#7C3AED;">${esc(p.rsvp.email)}</a>`),
    p.rsvp.phone ? row("Phone", esc(p.rsvp.phone)) : "",
    p.rsvp.dietaryRestrictions ? row("Dietary needs", esc(p.rsvp.dietaryRestrictions)) : "",
    p.rsvp.message ? row("Message", esc(p.rsvp.message).replace(/\n/g, "<br>")) : "",
    row("Submitted", esc(formatDateTime(p.rsvp.createdAt, p.event.timezone))),
  ]
    .filter(Boolean)
    .join("");

  const html = layout(
    subject,
    `<p style="margin:0 0 4px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;">New RSVP</p>
     <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${esc(p.rsvp.name)} ${verb}</h1>
     <p style="margin:0 0 20px;font-size:14px;color:#4B5563;">for <strong>${esc(p.event.title)}</strong> on ${esc(formatDateTime(p.event.startsAt, p.event.timezone))}.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F3E8FF;border-bottom:1px solid #F3E8FF;margin-bottom:20px;">${details}</table>
     <p style="margin:0 0 20px;font-size:14px;color:#4B5563;">
       Running totals — attending <strong>${p.totals.attending}</strong>,
       maybe <strong>${p.totals.maybe}</strong>,
       not attending <strong>${p.totals.notAttending}</strong>.
       Expected head count: <strong>${p.totals.expectedAttendees}</strong>.
     </p>
     <a href="${esc(p.dashboardUrl)}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;">Open the dashboard</a>`,
  );

  const text = [
    `${p.rsvp.name} ${verb} for ${p.event.title}`,
    "",
    `Response:   ${statusLabel}`,
    `Attendees:  ${p.rsvp.attendeesCount}`,
    `Email:      ${p.rsvp.email}`,
    p.rsvp.phone ? `Phone:      ${p.rsvp.phone}` : "",
    p.rsvp.dietaryRestrictions ? `Dietary:    ${p.rsvp.dietaryRestrictions}` : "",
    p.rsvp.message ? `Message:    ${p.rsvp.message}` : "",
    `Submitted:  ${formatDateTime(p.rsvp.createdAt, p.event.timezone)}`,
    "",
    `Totals — attending ${p.totals.attending}, maybe ${p.totals.maybe}, not attending ${p.totals.notAttending}.`,
    `Expected head count: ${p.totals.expectedAttendees}`,
    "",
    p.dashboardUrl,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

export interface GuestConfirmationParams {
  event: Pick<Event, "title" | "timezone" | "startsAt" | "locationName" | "locationAddress">;
  rsvp: Pick<Rsvp, "name" | "status" | "attendeesCount">;
  invitationUrl: string;
  contactEmail: string | null;
}

/** Receipt sent to the guest so they have a record of what they submitted. */
export function guestConfirmationEmail(p: GuestConfirmationParams) {
  const status = p.rsvp.status as RsvpStatusValue;
  const subject = `Thanks — your RSVP for ${p.event.title}`;

  const attendingBlock =
    status === "ATTENDING"
      ? `<p style="margin:0 0 20px;font-size:14px;color:#4B5563;">We have you down for <strong>${p.rsvp.attendeesCount}</strong> ${p.rsvp.attendeesCount === 1 ? "person" : "people"}.</p>`
      : "";

  const where = [p.event.locationName, p.event.locationAddress].filter(Boolean).join(" · ");

  const html = layout(
    subject,
    `<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">Thanks, ${esc(p.rsvp.name)}!</h1>
     <p style="margin:0 0 12px;font-size:14px;color:#4B5563;">Your response — <strong>${esc(RSVP_STATUS_LABELS[status])}</strong> — has been recorded for <strong>${esc(p.event.title)}</strong>.</p>
     ${attendingBlock}
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F3E8FF;border-bottom:1px solid #F3E8FF;margin-bottom:20px;">
       ${row("When", esc(formatDateTime(p.event.startsAt, p.event.timezone)))}
       ${where ? row("Where", esc(where)) : ""}
     </table>
     <p style="margin:0 0 20px;font-size:14px;color:#4B5563;">Plans changed? Submit the form again with the same email address and we will update your response.</p>
     <a href="${esc(p.invitationUrl)}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;">View the invitation</a>`,
  );

  const text = [
    `Thanks, ${p.rsvp.name}!`,
    "",
    `Your response — ${RSVP_STATUS_LABELS[status]} — has been recorded for ${p.event.title}.`,
    status === "ATTENDING" ? `Party size: ${p.rsvp.attendeesCount}` : "",
    "",
    `When:  ${formatDateTime(p.event.startsAt, p.event.timezone)}`,
    where ? `Where: ${where}` : "",
    "",
    "Plans changed? Submit the form again with the same email address.",
    p.invitationUrl,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
