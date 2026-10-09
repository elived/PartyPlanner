import { fail, handle, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getAppOrigin } from "@/lib/urls";
import { rsvpSubmissionSchema } from "@/lib/validations/rsvp";
import { notifyRsvp } from "@/server/services/notifications";
import { submitRsvp } from "@/server/services/rsvps";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/**
 * The only unauthenticated write in the application, so it carries the most
 * defences: a rate limit per IP, a honeypot field, server-side re-validation
 * against the event's own rules, and no information about events that are not
 * published.
 */
export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    const limit = await rateLimit(clientKey(request, "rsvp"), 10, 10 * 60 * 1000);
    if (!limit.success) {
      return fail(
        "Too many submissions from this device. Please try again shortly.",
        429,
        undefined,
        rateLimitHeaders(limit),
      );
    }

    const { slug } = await params;
    const input = rsvpSubmissionSchema.parse(await readJson(request));

    // Honeypot hit. Answer exactly as we would on success so a bot gets no
    // signal that it was detected.
    if (input.website) {
      return ok({ outcome: "created", status: input.status });
    }

    const event = await prisma.event.findUnique({
      where: { slug },
      include: { owner: { select: { email: true, name: true } } },
    });

    if (!event || event.status !== "PUBLISHED") {
      return fail("That invitation could not be found.", 404);
    }

    const { outcome, rsvp } = await submitRsvp(event, input);

    // Awaited rather than fire-and-forget: a serverless function is frozen the
    // moment its response is returned, which would drop an in-flight send.
    await notifyRsvp({
      event,
      rsvp,
      isUpdate: outcome === "updated",
      origin: await getAppOrigin(),
    });

    return ok({ outcome, status: rsvp.status, attendeesCount: rsvp.attendeesCount });
  });
}
