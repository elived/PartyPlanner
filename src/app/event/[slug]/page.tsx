import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth";
import { InvitationView } from "@/components/invitation/invitation-view";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import type { InvitationEvent } from "@/components/invitation/types";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME_VALUES, type ThemeValues } from "@/lib/theme";
import { getEventBySlugForViewer } from "@/server/services/events";

type Params = { params: Promise<{ slug: string }> };

/**
 * The invitation is rendered per-request rather than cached: the RSVP capacity
 * check has to reflect reality, and a stale "places left" is worse than a
 * fractionally slower page. Everything above the fold is still server-rendered,
 * so the guest sees content immediately.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true, description: true, bannerImageUrl: true },
  });

  if (!event) return { title: "Invitation not found" };

  const description =
    event.description?.slice(0, 180) ?? "You are invited — let us know if you can make it.";

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      ...(event.bannerImageUrl ? { images: [{ url: event.bannerImageUrl }] } : {}),
    },
    twitter: { card: event.bannerImageUrl ? "summary_large_image" : "summary" },
  };
}

export default async function InvitationPage({ params }: Params) {
  const { slug } = await params;

  // The owner may preview their own draft; everyone else only sees published
  // events, and an unpublished slug 404s rather than hinting that it exists.
  const viewer = await getCurrentUser();
  const event = await getEventBySlugForViewer(slug, viewer?.id ?? null);
  if (!event) notFound();

  const deadlinePassed = Boolean(event.rsvpDeadline && event.rsvpDeadline.getTime() < Date.now());

  let fullyBooked = false;
  if (event.maxGuests) {
    const taken = await prisma.rsvp.aggregate({
      where: { eventId: event.id, status: "ATTENDING" },
      _sum: { attendeesCount: true },
    });
    fullyBooked = (taken._sum.attendeesCount ?? 0) >= event.maxGuests;
  }

  const theme: ThemeValues = event.theme
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
    : DEFAULT_THEME_VALUES;

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

  return (
    <div id="main">
      {event.status !== "PUBLISHED" && (
        <p className="bg-amber-100 px-4 py-2.5 text-center text-sm font-medium text-amber-900">
          You are previewing an unpublished event. Guests cannot see this page yet.{" "}
          <Link href={`/dashboard/events/${event.id}`} className="underline underline-offset-2">
            Edit it
          </Link>
        </p>
      )}

      <InvitationView
        event={invitation}
        theme={theme}
        rsvpSlot={
          <RsvpForm
            event={invitation}
            theme={theme}
            deadlinePassed={deadlinePassed}
            fullyBooked={fullyBooked}
          />
        }
      />
    </div>
  );
}
