import "server-only";
import type { Event, Rsvp, User } from "@prisma/client";
import { sendMail } from "@/lib/mail/mailer";
import { guestConfirmationEmail, rsvpNotificationEmail } from "@/lib/mail/templates";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { eventStats } from "./rsvps";

/**
 * Notification fan-out for a saved RSVP.
 *
 * Called *after* the write has committed and awaited before the response is
 * returned. Vercel's serverless runtime freezes the function once the response
 * is sent, so a floating promise would be killed mid-flight — `after()` or a
 * queue is the alternative, but a couple of hundred milliseconds of mail latency
 * is a fair price for a guest who is already waiting on a confirmation screen.
 *
 * Failures are swallowed on purpose: a bounced notification must never turn a
 * successfully recorded RSVP into an error for the guest.
 */
export async function notifyRsvp(params: {
  event: Event & { owner?: Pick<User, "email" | "name"> | null };
  rsvp: Rsvp;
  isUpdate: boolean;
  /**
   * The deployment's public origin, resolved by the caller (which has request
   * context). Passed in rather than read here so this service stays free of
   * framework globals and can be called from a job or a test.
   */
  origin: string;
}) {
  const { event, rsvp, isUpdate, origin } = params;

  const invitationUrl = absoluteUrl(`/event/${event.slug}`, origin);
  const dashboardUrl = absoluteUrl(`/dashboard/events/${event.id}/rsvps`, origin);

  const tasks: Promise<unknown>[] = [];

  if (event.notifyOnRsvp) {
    const recipient = event.notifyEmail ?? (await ownerEmail(event));
    if (recipient) {
      const totals = await eventStats(event.id);
      const mail = rsvpNotificationEmail({ event, rsvp, totals, dashboardUrl, isUpdate });
      tasks.push(
        sendMail({
          to: recipient,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          // Lets the organiser hit reply and reach the guest directly.
          replyTo: rsvp.email,
        }),
      );
    }
  }

  const confirmation = guestConfirmationEmail({
    event,
    rsvp,
    invitationUrl,
    contactEmail: event.contactEmail,
  });
  tasks.push(
    sendMail({
      to: rsvp.email,
      subject: confirmation.subject,
      html: confirmation.html,
      text: confirmation.text,
      ...(event.contactEmail ? { replyTo: event.contactEmail } : {}),
    }),
  );

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[notifications] delivery failed:", result.reason);
    }
  }
}

async function ownerEmail(event: Event & { owner?: Pick<User, "email"> | null }) {
  if (event.owner?.email) return event.owner.email;
  const owner = await prisma.user.findUnique({
    where: { id: event.ownerId },
    select: { email: true },
  });
  return owner?.email ?? null;
}
