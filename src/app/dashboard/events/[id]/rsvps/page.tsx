import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth";
import { RsvpManager } from "@/components/dashboard/rsvp-manager";
import { StatCard } from "@/components/ui/misc";
import { getEventForOwner } from "@/server/services/events";
import { eventStats, listRsvps } from "@/server/services/rsvps";
import { rsvpQuerySchema } from "@/lib/validations/rsvp";

export const metadata: Metadata = { title: "RSVPs" };
export const dynamic = "force-dynamic";

export default async function RsvpsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = (await getCurrentUser())!;
  const { id } = await params;

  const event = await getEventForOwner(id, user.id).catch(() => null);
  if (!event) notFound();

  // Search state lives in the URL, so a filtered view is shareable, survives a
  // refresh, and works with the browser's back button.
  const query = rsvpQuerySchema.parse(await searchParams);
  const [page, stats] = await Promise.all([listRsvps(event.id, query), eventStats(event.id)]);

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Responses" value={stats.total} hint="Total RSVPs received" />
        <StatCard label="Attending" value={stats.attending} tone="positive" />
        <StatCard label="Maybe" value={stats.maybe} tone="warning" />
        <StatCard label="Not attending" value={stats.notAttending} tone="negative" />
        <StatCard
          label="Expected guests"
          value={stats.expectedAttendees}
          tone="brand"
          hint={event.maxGuests ? `Capacity ${event.maxGuests}` : "Including plus-ones"}
        />
      </dl>

      <RsvpManager
        eventId={event.id}
        eventTimezone={event.timezone}
        initialPage={page}
        query={query}
      />
    </div>
  );
}
