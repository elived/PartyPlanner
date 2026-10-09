import { getCurrentUser } from "@/auth";
import { fail, handle, ok, unauthorized } from "@/lib/api";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, storeUpload } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Authenticated image upload for banners and logos. Only signed-in organisers
 * can reach it — an open upload endpoint is free hosting for whoever finds it.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const limit = await rateLimit(`upload:${user.id}`, 40, 60 * 60 * 1000);
    if (!limit.success) {
      return fail("Too many uploads. Try again in a little while.", 429, undefined, rateLimitHeaders(limit));
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("No file was uploaded.", 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail("That image is larger than 5 MB.", 413);
    }

    // Files are namespaced per user, which keeps one organiser's uploads out of
    // another's prefix in blob storage.
    const result = await storeUpload(file, `u/${user.id}`);
    if (!result.ok) return fail(result.error, result.status);

    return ok({ url: result.url });
  });
}
