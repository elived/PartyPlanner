import { toCalendarStamp } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getAppOrigin } from "@/lib/urls";
import { absoluteUrl } from "@/lib/utils";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/** RFC 5545 requires CRLF line endings and folding of lines over 75 octets. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) chunks.push(` ${line.slice(i, i + 74)}`);
  return chunks.join("\r\n");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * A calendar file for the invitation. Times are emitted as UTC (the trailing Z)
 * rather than with a VTIMEZONE block: every calendar client converts correctly,
 * and it avoids shipping a timezone database in the response.
 */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;

  const event = await prisma.event.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true, slug: true, title: true, description: true, startsAt: true,
      endsAt: true, locationName: true, locationAddress: true, updatedAt: true,
    },
  });

  if (!event) return new Response("Not found", { status: 404 });

  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 3 * 60 * 60 * 1000);
  const location = [event.locationName, event.locationAddress].filter(Boolean).join(", ");
  const url = absoluteUrl(`/event/${event.slug}`, await getAppOrigin());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Party Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@party-planner`,
    `DTSTAMP:${toCalendarStamp(event.updatedAt)}`,
    `DTSTART:${toCalendarStamp(event.startsAt)}`,
    `DTEND:${toCalendarStamp(end)}`,
    fold(`SUMMARY:${escapeText(event.title)}`),
    event.description ? fold(`DESCRIPTION:${escapeText(event.description)}`) : "",
    location ? fold(`LOCATION:${escapeText(location)}`) : "",
    fold(`URL:${escapeText(url)}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}.ics"`,
      "cache-control": "public, max-age=300",
    },
  });
}
