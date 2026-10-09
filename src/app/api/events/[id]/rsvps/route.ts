import { getCurrentUser } from "@/auth";
import { handle, ok, unauthorized } from "@/lib/api";
import { rsvpQuerySchema } from "@/lib/validations/rsvp";
import { getEventForOwner } from "@/server/services/events";
import { eventStats, listRsvps } from "@/server/services/rsvps";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    await getEventForOwner(id, user.id); // throws 403/404 if not the owner

    const query = rsvpQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    const [page, stats] = await Promise.all([listRsvps(id, query), eventStats(id)]);
    return ok({ ...page, stats });
  });
}
