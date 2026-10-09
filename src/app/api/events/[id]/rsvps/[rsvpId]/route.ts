import { getCurrentUser } from "@/auth";
import { handle, ok, unauthorized } from "@/lib/api";
import { getEventForOwner } from "@/server/services/events";
import { deleteRsvp } from "@/server/services/rsvps";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; rsvpId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id, rsvpId } = await params;
    await getEventForOwner(id, user.id);
    // Scoped by event id as well, so an RSVP from another event cannot be
    // deleted by guessing its id.
    await deleteRsvp(id, rsvpId);

    return ok({ deleted: true });
  });
}
