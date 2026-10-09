import { getCurrentUser } from "@/auth";
import { handle, ok, readJson, unauthorized } from "@/lib/api";
import { createEventSchema } from "@/lib/validations/event";
import { createEvent, listEventsForOwner } from "@/server/services/events";

export const runtime = "nodejs";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return ok(await listEventsForOwner(user.id));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const input = createEventSchema.parse(await readJson(request));
    const event = await createEvent(user.id, input);

    return ok(event, { status: 201 });
  });
}
