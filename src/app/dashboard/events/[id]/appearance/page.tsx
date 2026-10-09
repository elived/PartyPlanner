import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth";
import { AppearanceEditor, type AppearanceState } from "@/components/dashboard/appearance-editor";
import type { InvitationEvent } from "@/components/invitation/types";
import { DEFAULT_THEME_VALUES } from "@/lib/theme";
import { getEventForOwner } from "@/server/services/events";

export const metadata: Metadata = { title: "Appearance" };
export const dynamic = "force-dynamic";

export default async function AppearancePage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser())!;
  const { id } = await params;

  const event = await getEventForOwner(id, user.id).catch(() => null);
  if (!event) notFound();

  const initial: AppearanceState = {
    ...(event.theme
      ? {
          primaryColor: event.theme.primaryColor,
          secondaryColor: event.theme.secondaryColor,
          backgroundColor: event.theme.backgroundColor,
          surfaceColor: event.theme.surfaceColor,
          textColor: event.theme.textColor,
          bodyFont: event.theme.bodyFont,
          headingFont: event.theme.headingFont,
          buttonStyle: event.theme.buttonStyle,
          buttonShape: event.theme.buttonShape,
        }
      : DEFAULT_THEME_VALUES),
    logoUrl: event.logoUrl,
    bannerImageUrl: event.bannerImageUrl,
  };

  // Only the fields the invitation actually renders cross to the client — no
  // owner id, notification address or duplicate-handling settings.
  const invitation: InvitationEvent = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    locationUrl: event.locationUrl,
    bannerImageUrl: event.bannerImageUrl,
    logoUrl: event.logoUrl,
    contactName: event.contactName,
    contactEmail: event.contactEmail,
    contactPhone: event.contactPhone,
    rsvpDeadline: event.rsvpDeadline,
    maxAttendeesPerRsvp: event.maxAttendeesPerRsvp,
    collectPhone: event.collectPhone,
    collectDietary: event.collectDietary,
    collectMessage: event.collectMessage,
    showCountdown: event.showCountdown,
  };

  return <AppearanceEditor eventId={event.id} event={invitation} initial={initial} />;
}
