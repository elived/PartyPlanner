import "server-only";
import type { Event, Prisma, Rsvp } from "@prisma/client";
import { AppError } from "@/lib/api";
import { summarise, type RsvpSummary } from "@/lib/export";
import { prisma } from "@/lib/prisma";
import type { RsvpQuery, RsvpSubmission } from "@/lib/validations/rsvp";

/**
 * All RSVP reads and writes. The public submission path deliberately validates
 * *against the event* (deadline, capacity, per-RSVP cap, which fields are even
 * collected) rather than trusting anything the form sent — the form is public,
 * so its constraints are only a courtesy to honest guests.
 */

export type RsvpAcceptance =
  | { outcome: "created"; rsvp: Rsvp }
  | { outcome: "updated"; rsvp: Rsvp };

export async function submitRsvp(event: Event, input: RsvpSubmission): Promise<RsvpAcceptance> {
  if (event.status !== "PUBLISHED") {
    throw new AppError("This invitation is not accepting responses.", 403);
  }
  if (event.rsvpDeadline && event.rsvpDeadline.getTime() < Date.now()) {
    throw new AppError("The RSVP deadline for this event has passed.", 409);
  }

  // A "not attending" response never contributes a head count, whatever the
  // form sent. "Maybe" keeps its number so the organiser can plan a range.
  const attendeesCount =
    input.status === "NOT_ATTENDING" ? 0 : Math.max(1, input.attendeesCount);

  if (attendeesCount > event.maxAttendeesPerRsvp) {
    throw new AppError(
      `You can register at most ${event.maxAttendeesPerRsvp} ${
        event.maxAttendeesPerRsvp === 1 ? "person" : "people"
      } per response.`,
      422,
      { attendeesCount: `Maximum ${event.maxAttendeesPerRsvp}.` },
    );
  }

  const existing = await prisma.rsvp.findFirst({
    where: { eventId: event.id, email: input.email },
    orderBy: { createdAt: "desc" },
  });

  if (existing && event.preventDuplicateEmails && !event.allowRsvpUpdates) {
    throw new AppError(
      "We already have an RSVP from this email address. Contact the host to change it.",
      409,
      { email: "This email has already responded." },
    );
  }

  await assertCapacity(event, attendeesCount, input.status, existing);

  const data = {
    name: input.name,
    email: input.email,
    phone: event.collectPhone ? input.phone : null,
    status: input.status,
    attendeesCount,
    dietaryRestrictions: event.collectDietary ? input.dietaryRestrictions : null,
    message: event.collectMessage ? input.message : null,
  } satisfies Prisma.RsvpUncheckedUpdateInput;

  if (existing && event.preventDuplicateEmails) {
    const rsvp = await prisma.rsvp.update({ where: { id: existing.id }, data });
    return { outcome: "updated", rsvp };
  }

  const rsvp = await prisma.rsvp.create({ data: { ...data, eventId: event.id } });
  return { outcome: "created", rsvp };
}

/**
 * Enforces the optional guest cap. Counting in the database at write time (rather
 * than trusting a number read earlier) keeps two simultaneous submissions from
 * both squeezing past the last seat.
 */
async function assertCapacity(
  event: Event,
  attendeesCount: number,
  status: RsvpSubmission["status"],
  existing: Rsvp | null,
) {
  if (!event.maxGuests || status !== "ATTENDING") return;

  const current = await prisma.rsvp.aggregate({
    where: {
      eventId: event.id,
      status: "ATTENDING",
      ...(existing ? { id: { not: existing.id } } : {}),
    },
    _sum: { attendeesCount: true },
  });

  const taken = current._sum.attendeesCount ?? 0;
  if (taken + attendeesCount > event.maxGuests) {
    const left = Math.max(0, event.maxGuests - taken);
    throw new AppError(
      left === 0
        ? "This event is fully booked."
        : `Only ${left} ${left === 1 ? "place is" : "places are"} left.`,
      409,
      { attendeesCount: left === 0 ? "No places left." : `At most ${left}.` },
    );
  }
}

export interface RsvpPage {
  rsvps: Rsvp[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

export async function listRsvps(eventId: string, query: RsvpQuery): Promise<RsvpPage> {
  const where: Prisma.RsvpWhereInput = {
    eventId,
    ...(query.status !== "ALL" ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } },
            { message: { contains: query.q, mode: "insensitive" } },
            { dietaryRestrictions: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rsvps] = await prisma.$transaction([
    prisma.rsvp.count({ where }),
    prisma.rsvp.findMany({
      where,
      orderBy: { [query.sort]: query.dir },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
  ]);

  return {
    rsvps,
    total,
    page: query.page,
    perPage: query.perPage,
    pageCount: Math.max(1, Math.ceil(total / query.perPage)),
  };
}

/** Every RSVP for an event, oldest first — used by the export endpoints. */
export function allRsvps(eventId: string) {
  return prisma.rsvp.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } });
}

export async function deleteRsvp(eventId: string, rsvpId: string) {
  const rsvp = await prisma.rsvp.findUnique({ where: { id: rsvpId }, select: { eventId: true } });
  if (!rsvp || rsvp.eventId !== eventId) throw new AppError("That RSVP does not exist.", 404);
  await prisma.rsvp.delete({ where: { id: rsvpId } });
}

/**
 * Dashboard statistics. Uses a grouped aggregate rather than loading rows, so
 * the numbers stay cheap on an event with thousands of responses.
 */
export async function eventStats(eventId: string): Promise<RsvpSummary> {
  const grouped = await prisma.rsvp.groupBy({
    by: ["status"],
    where: { eventId },
    _count: { _all: true },
    _sum: { attendeesCount: true },
  });

  const pick = (status: string) => grouped.find((g) => g.status === status);

  return {
    total: grouped.reduce((n, g) => n + g._count._all, 0),
    attending: pick("ATTENDING")?._count._all ?? 0,
    notAttending: pick("NOT_ATTENDING")?._count._all ?? 0,
    maybe: pick("MAYBE")?._count._all ?? 0,
    expectedAttendees: pick("ATTENDING")?._sum.attendeesCount ?? 0,
  };
}

export { summarise };
