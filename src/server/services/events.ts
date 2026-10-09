import "server-only";
import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/api";
import { localInputToUtc } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { randomSuffix, slugify } from "@/lib/utils";
import {
  RESERVED_SLUGS,
  type CreateEventInput,
  type EventDetailsInput,
  type ThemeInput,
} from "@/lib/validations/event";

/**
 * The event service is the only place that talks to Prisma about events.
 *
 * Route handlers and server components both call in here, which means the
 * ownership check ("does this user own this event?") exists once. Pushing that
 * check down into the service — rather than repeating it in each route — is what
 * makes it hard to accidentally ship an endpoint without it.
 */

export const eventWithTheme = { theme: true } satisfies Prisma.EventInclude;

export type EventWithTheme = Prisma.EventGetPayload<{ include: typeof eventWithTheme }>;

/** Default appearance, applied when an event has no theme row yet. */
export const DEFAULT_THEME = {
  primaryColor: "#7C3AED",
  secondaryColor: "#EC4899",
  backgroundColor: "#FAF5FF",
  surfaceColor: "#FFFFFF",
  textColor: "#1F1235",
  bodyFont: "inter",
  headingFont: "playfair",
  buttonStyle: "SOLID",
  buttonShape: "ROUNDED",
} as const;

/**
 * Finds a free slug near `desired`. Tries the bare slug first, then appends a
 * short random suffix. A random suffix rather than `-2`, `-3`… because
 * incrementing counters let anyone probe how many events exist.
 */
export async function uniqueSlug(desired: string): Promise<string> {
  const base = slugify(desired) || "event";

  for (const candidate of [base, ...Array.from({ length: 5 }, () => `${base}-${randomSuffix()}`)]) {
    if (RESERVED_SLUGS.has(candidate)) continue;
    const taken = await prisma.event.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  // Astronomically unlikely; fall back to something guaranteed unique.
  return `${base}-${randomSuffix(10)}`;
}

export async function listEventsForOwner(ownerId: string) {
  const events = await prisma.event.findMany({
    where: { ownerId },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }],
    include: {
      theme: true,
      _count: { select: { rsvps: true } },
    },
  });

  // One grouped query for all events beats N per-event aggregates.
  const totals = await prisma.rsvp.groupBy({
    by: ["eventId", "status"],
    where: { eventId: { in: events.map((e) => e.id) } },
    _count: { _all: true },
    _sum: { attendeesCount: true },
  });

  return events.map((event) => {
    const rows = totals.filter((t) => t.eventId === event.id);
    const count = (status: string) =>
      rows.find((r) => r.status === status)?._count._all ?? 0;
    return {
      ...event,
      stats: {
        total: event._count.rsvps,
        attending: count("ATTENDING"),
        notAttending: count("NOT_ATTENDING"),
        maybe: count("MAYBE"),
        expectedAttendees:
          rows.find((r) => r.status === "ATTENDING")?._sum.attendeesCount ?? 0,
      },
    };
  });
}

/** Loads an event and asserts the caller owns it. Throws 404/403 otherwise. */
export async function getEventForOwner(eventId: string, ownerId: string): Promise<EventWithTheme> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: eventWithTheme,
  });
  if (!event) throw new AppError("That event does not exist.", 404);
  if (event.ownerId !== ownerId) throw new AppError("You do not have access to this event.", 403);
  return event;
}

export async function createEvent(ownerId: string, input: CreateEventInput) {
  if (input.slug && RESERVED_SLUGS.has(input.slug)) {
    throw new AppError("That URL is reserved. Pick another.", 422, {
      slug: "That URL is reserved.",
    });
  }
  if (input.slug) {
    const taken = await prisma.event.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (taken) {
      throw new AppError("That URL is already in use.", 422, {
        slug: "That URL is already taken.",
      });
    }
  }

  const slug = input.slug ?? (await uniqueSlug(input.title));

  return prisma.event.create({
    data: {
      ownerId,
      slug,
      title: input.title,
      timezone: input.timezone,
      startsAt: localInputToUtc(input.startsAtLocal, input.timezone),
      // Every event gets a theme row up front, so the appearance editor and the
      // invitation page never have to special-case "no theme yet".
      theme: { create: {} },
    },
    include: eventWithTheme,
  });
}

export async function updateEventDetails(
  eventId: string,
  ownerId: string,
  input: EventDetailsInput,
) {
  await getEventForOwner(eventId, ownerId);

  return prisma.event.update({
    where: { id: eventId },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      timezone: input.timezone,
      startsAt: localInputToUtc(input.startsAtLocal, input.timezone),
      endsAt: input.endsAtLocal ? localInputToUtc(input.endsAtLocal, input.timezone) : null,
      rsvpDeadline: input.rsvpDeadlineLocal
        ? localInputToUtc(input.rsvpDeadlineLocal, input.timezone)
        : null,
      locationName: input.locationName,
      locationAddress: input.locationAddress,
      locationUrl: input.locationUrl,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      maxGuests: input.maxGuests,
      maxAttendeesPerRsvp: input.maxAttendeesPerRsvp,
      preventDuplicateEmails: input.preventDuplicateEmails,
      allowRsvpUpdates: input.allowRsvpUpdates,
      collectPhone: input.collectPhone,
      collectDietary: input.collectDietary,
      collectMessage: input.collectMessage,
      showCountdown: input.showCountdown,
      notifyOnRsvp: input.notifyOnRsvp,
      notifyEmail: input.notifyEmail,
    },
    include: eventWithTheme,
  });
}

export async function updateEventTheme(eventId: string, ownerId: string, input: ThemeInput) {
  await getEventForOwner(eventId, ownerId);

  const { logoUrl, bannerImageUrl, ...theme } = input;

  // Banner and logo live on the event (they are content that the OG image and
  // notification emails need), while the palette lives on the theme row.
  const [updated] = await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: { logoUrl, bannerImageUrl },
      include: eventWithTheme,
    }),
    prisma.eventTheme.upsert({
      where: { eventId },
      create: { eventId, ...theme },
      update: theme,
    }),
  ]);

  return prisma.event.findUniqueOrThrow({ where: { id: updated.id }, include: eventWithTheme });
}

export async function updateEventSlug(eventId: string, ownerId: string, slug: string) {
  await getEventForOwner(eventId, ownerId);

  if (RESERVED_SLUGS.has(slug)) {
    throw new AppError("That URL is reserved.", 422, { slug: "That URL is reserved." });
  }
  const taken = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
  if (taken && taken.id !== eventId) {
    throw new AppError("That URL is already in use.", 422, { slug: "That URL is already taken." });
  }

  return prisma.event.update({ where: { id: eventId }, data: { slug }, include: eventWithTheme });
}

export async function deleteEvent(eventId: string, ownerId: string) {
  await getEventForOwner(eventId, ownerId);
  // RSVPs and the theme row cascade (see schema.prisma).
  await prisma.event.delete({ where: { id: eventId } });
}

/**
 * Public read for the invitation page. Drafts and archived events are invisible
 * to guests — the page 404s rather than 403s so an unpublished slug is not
 * confirmed to exist.
 */
export async function getPublishedEventBySlug(slug: string) {
  return prisma.event.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: eventWithTheme,
  });
}

/** Preview read: the owner may view their own event at any status. */
export async function getEventBySlugForViewer(slug: string, viewerId: string | null) {
  const event = await prisma.event.findUnique({ where: { slug }, include: eventWithTheme });
  if (!event) return null;
  if (event.status === "PUBLISHED") return event;
  return viewerId && event.ownerId === viewerId ? event : null;
}
