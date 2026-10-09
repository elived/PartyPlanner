import { CalendarDays, Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Countdown } from "@/components/invitation/countdown";
import type { InvitationEvent, InvitationTheme } from "@/components/invitation/types";
import {
  formatEventDate,
  formatEventTime,
  timeZoneAbbreviation,
  toCalendarStamp,
  toIsoWithOffset,
} from "@/lib/dates";
import { themeStyle } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * The invitation, rendered identically for guests and for the admin preview.
 *
 * Everything visual comes from CSS custom properties set on the outer element by
 * `themeStyle()`, so re-theming is a single style-object swap with no re-render
 * of anything below. Layout is mobile-first: a single column that gains a
 * two-column split only at `lg`.
 */
export function InvitationView({
  event,
  theme,
  rsvpSlot,
  className,
}: {
  event: InvitationEvent;
  theme: InvitationTheme;
  /** The RSVP form — real on the public page, a stand-in in the preview. */
  rsvpSlot: ReactNode;
  className?: string;
}) {
  const sameDay =
    event.endsAt &&
    formatEventDate(event.startsAt, event.timezone) ===
      formatEventDate(event.endsAt, event.timezone);

  const zone = timeZoneAbbreviation(event.startsAt, event.timezone);
  const contactLines = [event.contactName, event.contactEmail, event.contactPhone].filter(Boolean);

  return (
    <div style={themeStyle(theme)} className={cn("pp-scope min-h-full", className)}>
      <header className="relative">
        {event.bannerImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied host
          <img
            src={event.bannerImageUrl}
            alt=""
            className="h-48 w-full object-cover sm:h-64 lg:h-80"
          />
        ) : (
          <div
            aria-hidden
            className="h-32 w-full sm:h-40"
            style={{
              background: `linear-gradient(135deg, var(--pp-primary), var(--pp-secondary))`,
            }}
          />
        )}

        {event.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied host
          <img
            src={event.logoUrl}
            alt=""
            className="absolute bottom-0 left-1/2 size-20 -translate-x-1/2 translate-y-1/2 rounded-full border-4 object-cover shadow-lg"
            style={{ borderColor: "var(--pp-surface)", background: "var(--pp-surface)" }}
          />
        )}
      </header>

      <div
        className={cn(
          "mx-auto w-full max-w-5xl px-4 pb-16",
          event.logoUrl ? "pt-16" : "pt-10",
        )}
      >
        <div className="text-center">
          <h1 className="text-balance text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {event.title}
          </h1>
          <p className="mt-3 text-base opacity-80 sm:text-lg">
            <time dateTime={toIsoWithOffset(event.startsAt, event.timezone)}>
              {formatEventDate(event.startsAt, event.timezone)}
            </time>
          </p>
        </div>

        {event.showCountdown && (
          <div className="mt-8">
            <Countdown target={event.startsAt} label="Counting down" />
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="flex flex-col gap-6">
            <section
              className="rounded-2xl p-5 shadow-sm sm:p-6"
              style={{ background: "var(--pp-surface)" }}
            >
              <h2 className="sr-only">Event details</h2>
              <dl className="flex flex-col gap-4">
                <DetailRow icon={CalendarDays} label="Date">
                  <time dateTime={toIsoWithOffset(event.startsAt, event.timezone)}>
                    {formatEventDate(event.startsAt, event.timezone)}
                  </time>
                  {event.endsAt && !sameDay && (
                    <>
                      {" – "}
                      <time dateTime={toIsoWithOffset(event.endsAt, event.timezone)}>
                        {formatEventDate(event.endsAt, event.timezone)}
                      </time>
                    </>
                  )}
                </DetailRow>

                <DetailRow icon={Clock} label="Time">
                  {formatEventTime(event.startsAt, event.timezone)}
                  {event.endsAt && ` – ${formatEventTime(event.endsAt, event.timezone)}`}
                  <span className="ml-1 opacity-60">({zone})</span>
                </DetailRow>

                {(event.locationName || event.locationAddress) && (
                  <DetailRow icon={MapPin} label="Location">
                    {event.locationName && <span className="font-medium">{event.locationName}</span>}
                    {event.locationName && event.locationAddress && <br />}
                    {event.locationAddress}
                    {event.locationUrl && (
                      <>
                        <br />
                        <a
                          href={event.locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline underline-offset-2"
                          style={{ color: "var(--pp-primary)" }}
                        >
                          Open map
                        </a>
                      </>
                    )}
                  </DetailRow>
                )}
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={googleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-[var(--pp-radius)] border px-3 py-1.5 text-sm font-semibold"
                  style={{ borderColor: "var(--pp-primary)", color: "var(--pp-primary)" }}
                >
                  Add to Google Calendar
                </a>
                <a
                  href={`/event/${event.slug}/calendar.ics`}
                  className="inline-flex items-center rounded-[var(--pp-radius)] border px-3 py-1.5 text-sm font-semibold"
                  style={{ borderColor: "var(--pp-primary)", color: "var(--pp-primary)" }}
                >
                  Download .ics
                </a>
              </div>
            </section>

            {event.description && (
              <section
                className="rounded-2xl p-5 shadow-sm sm:p-6"
                style={{ background: "var(--pp-surface)" }}
              >
                <h2 className="pp-heading text-xl font-semibold">Details</h2>
                {/* whitespace-pre-line preserves the organiser's line breaks
                    without ever interpreting their text as HTML. */}
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed opacity-90">
                  {event.description}
                </p>
              </section>
            )}

            {contactLines.length > 0 && (
              <section
                className="rounded-2xl p-5 shadow-sm sm:p-6"
                style={{ background: "var(--pp-surface)" }}
              >
                <h2 className="pp-heading text-xl font-semibold">Questions?</h2>
                <ul className="mt-3 flex flex-col gap-2 text-[15px]">
                  {event.contactName && <li className="font-medium">{event.contactName}</li>}
                  {event.contactEmail && (
                    <li className="flex items-center gap-2">
                      <Mail aria-hidden className="size-4 opacity-60" />
                      <a href={`mailto:${event.contactEmail}`} className="underline underline-offset-2">
                        {event.contactEmail}
                      </a>
                    </li>
                  )}
                  {event.contactPhone && (
                    <li className="flex items-center gap-2">
                      <Phone aria-hidden className="size-4 opacity-60" />
                      <a href={`tel:${event.contactPhone.replace(/\s/g, "")}`} className="underline underline-offset-2">
                        {event.contactPhone}
                      </a>
                    </li>
                  )}
                </ul>
              </section>
            )}
          </div>

          <div className="lg:sticky lg:top-6">{rsvpSlot}</div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full"
        style={{ background: "rgb(var(--pp-primary-rgb) / 0.12)", color: "var(--pp-primary)" }}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide opacity-60">{label}</dt>
        <dd className="mt-0.5 text-[15px] leading-relaxed">{children}</dd>
      </div>
    </div>
  );
}

function googleCalendarUrl(event: InvitationEvent): string {
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 3 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCalendarStamp(event.startsAt)}/${toCalendarStamp(end)}`,
    details: event.description ?? "",
    location: [event.locationName, event.locationAddress].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
