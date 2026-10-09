import { CalendarDays, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { Badge } from "@/components/ui/misc";
import { formatEventDate, formatEventTime } from "@/lib/dates";
import { absoluteUrl } from "@/lib/utils";

interface EventCardEvent {
  id: string;
  slug: string;
  title: string;
  status: string;
  startsAt: Date;
  timezone: string;
  locationName: string | null;
  bannerImageUrl: string | null;
  stats: { total: number; attending: number; maybe: number; expectedAttendees: number };
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Live",
  ARCHIVED: "Archived",
};

export function EventCard({ event, origin }: { event: EventCardEvent; origin: string }) {
  const invitationUrl = absoluteUrl(`/event/${event.slug}`, origin);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {event.bannerImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied host
        <img
          src={event.bannerImageUrl}
          alt=""
          className="h-28 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div aria-hidden className="h-28 w-full bg-gradient-to-br from-brand-500 to-pink-500" />
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold leading-snug text-slate-900">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="hover:text-brand-700 hover:underline"
            >
              {event.title}
            </Link>
          </h2>
          <Badge tone={event.status}>{STATUS_LABEL[event.status] ?? event.status}</Badge>
        </div>

        <dl className="flex flex-col gap-1.5 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Date</dt>
            <CalendarDays aria-hidden className="size-4 shrink-0 text-slate-400" />
            <dd>
              <time dateTime={event.startsAt.toISOString()}>
                {formatEventDate(event.startsAt, event.timezone)} ·{" "}
                {formatEventTime(event.startsAt, event.timezone)}
              </time>
            </dd>
          </div>
          {event.locationName && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Location</dt>
              <MapPin aria-hidden className="size-4 shrink-0 text-slate-400" />
              <dd className="truncate">{event.locationName}</dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <dt className="sr-only">Responses</dt>
            <Users aria-hidden className="size-4 shrink-0 text-slate-400" />
            <dd>
              {event.stats.total === 0 ? (
                "No responses yet"
              ) : (
                <>
                  <strong className="font-semibold text-slate-900">
                    {event.stats.expectedAttendees}
                  </strong>{" "}
                  expected · {event.stats.total}{" "}
                  {event.stats.total === 1 ? "response" : "responses"}
                </>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Edit
          </Link>
          <Link
            href={`/dashboard/events/${event.id}/rsvps`}
            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            RSVPs
          </Link>
          <Link
            href={`/event/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            View
          </Link>
          <CopyLinkButton url={invitationUrl} className="ml-auto" />
        </div>
      </div>
    </article>
  );
}
