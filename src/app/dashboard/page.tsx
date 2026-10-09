import { CalendarPlus, PartyPopper } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/auth";
import { EventCard } from "@/components/dashboard/event-card";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, StatCard } from "@/components/ui/misc";
import { getAppOrigin } from "@/lib/urls";
import { listEventsForOwner } from "@/server/services/events";

export const metadata: Metadata = { title: "Your events" };

// The dashboard is per-user and changes on every RSVP — never cache it.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const [events, origin] = await Promise.all([
    listEventsForOwner(user.id),
    getAppOrigin(),
  ]);

  const totals = events.reduce(
    (acc, e) => ({
      events: acc.events + 1,
      published: acc.published + (e.status === "PUBLISHED" ? 1 : 0),
      responses: acc.responses + e.stats.total,
      expected: acc.expected + e.stats.expectedAttendees,
    }),
    { events: 0, published: 0, responses: 0, expected: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your events</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create an invitation page, share the link, and track who is coming.
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button icon={<CalendarPlus aria-hidden className="size-4" />}>New event</Button>
        </Link>
      </div>

      {events.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Events" value={totals.events} />
          <StatCard label="Published" value={totals.published} tone="brand" />
          <StatCard label="Responses" value={totals.responses} />
          <StatCard label="Expected guests" value={totals.expected} tone="positive" />
        </dl>
      )}

      {events.length === 0 ? (
        <Card>
          <EmptyState
            icon={PartyPopper}
            title="No events yet"
            description="Your first invitation page takes about a minute: a title, a date, and you are ready to share."
            action={
              <Link href="/dashboard/events/new">
                <Button icon={<CalendarPlus aria-hidden className="size-4" />}>
                  Create your first event
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} origin={origin} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
