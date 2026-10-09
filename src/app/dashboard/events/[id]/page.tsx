import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth";
import { DangerZone } from "@/components/dashboard/danger-zone";
import { EventDetailsForm } from "@/components/dashboard/event-details-form";
import { utcToLocalInput } from "@/lib/dates";
import { getAppOrigin } from "@/lib/urls";
import { getEventForOwner } from "@/server/services/events";

export const metadata: Metadata = { title: "Event details" };
export const dynamic = "force-dynamic";

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser())!;
  const { id } = await params;

  const event = await getEventForOwner(id, user.id).catch(() => null);
  if (!event) notFound();

  // Timestamps are stored as UTC instants; the form edits them as wall-clock
  // strings in the event's own zone, so the conversion happens here, once.
  const defaults = {
    title: event.title,
    description: event.description,
    startsAtLocal: utcToLocalInput(event.startsAt, event.timezone),
    endsAtLocal: utcToLocalInput(event.endsAt, event.timezone) || null,
    rsvpDeadlineLocal: utcToLocalInput(event.rsvpDeadline, event.timezone) || null,
    timezone: event.timezone,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    locationUrl: event.locationUrl,
    contactName: event.contactName,
    contactEmail: event.contactEmail,
    contactPhone: event.contactPhone,
    maxGuests: event.maxGuests,
    maxAttendeesPerRsvp: event.maxAttendeesPerRsvp,
    preventDuplicateEmails: event.preventDuplicateEmails,
    allowRsvpUpdates: event.allowRsvpUpdates,
    collectPhone: event.collectPhone,
    collectDietary: event.collectDietary,
    collectMessage: event.collectMessage,
    showCountdown: event.showCountdown,
    notifyOnRsvp: event.notifyOnRsvp,
    notifyEmail: event.notifyEmail,
    status: event.status,
  };

  return (
    <div className="flex flex-col gap-6">
      <EventDetailsForm
        eventId={event.id}
        slug={event.slug}
        origin={await getAppOrigin()}
        ownerEmail={user.email ?? ""}
        defaults={defaults}
      />
      <DangerZone eventId={event.id} eventTitle={event.title} />
    </div>
  );
}
