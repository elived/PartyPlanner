import { z } from "zod";
import { getCurrentUser } from "@/auth";
import { AppError, handle, ok, readJson, unauthorized } from "@/lib/api";
import { eventDetailsSchema, themeSchema } from "@/lib/validations/event";
import {
  deleteEvent,
  getEventForOwner,
  updateEventDetails,
  updateEventSlug,
  updateEventTheme,
} from "@/server/services/events";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * One PATCH endpoint, three payload shapes, discriminated on `section`.
 *
 * The alternative — /details, /appearance, /slug — would triple the auth and
 * ownership plumbing for what is fundamentally one resource. The discriminated
 * union keeps each shape independently validated while the ownership check
 * happens exactly once, inside the service.
 */
const patchSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("details"), values: eventDetailsSchema }),
  z.object({ section: z.literal("appearance"), values: themeSchema }),
  z.object({
    section: z.literal("slug"),
    values: z.object({
      slug: z
        .string()
        .trim()
        .min(3, "At least 3 characters")
        .max(60)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
    }),
  }),
]);

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    return ok(await getEventForOwner(id, user.id));
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const body = patchSchema.parse(await readJson(request));

    switch (body.section) {
      case "details":
        return ok(await updateEventDetails(id, user.id, body.values));
      case "appearance":
        return ok(await updateEventTheme(id, user.id, body.values));
      case "slug":
        return ok(await updateEventSlug(id, user.id, body.values.slug));
      default:
        throw new AppError("Unknown section.", 400);
    }
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    await deleteEvent(id, user.id);
    return ok({ deleted: true });
  });
}
