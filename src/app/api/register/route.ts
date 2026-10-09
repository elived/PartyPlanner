import bcrypt from "bcryptjs";
import { AppError, fail, handle, ok, readJson } from "@/lib/api";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handle(async () => {
    if (!env().ALLOW_PUBLIC_REGISTRATION) {
      return fail("Registration is closed on this instance.", 403);
    }

    const limit = await rateLimit(clientKey(request, "register"), 5, 60 * 60 * 1000);
    if (!limit.success) {
      return fail("Too many sign-up attempts. Try again later.", 429, undefined, rateLimitHeaders(limit));
    }

    const input = registerSchema.parse(await readJson(request));

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      // Deliberately specific: an account-creation form cannot hide that an
      // email is taken (the user has to be told why they can't proceed), so
      // the honest message is better than a false success.
      throw new AppError("An account with that email already exists.", 409, {
        email: "That email is already registered.",
      });
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        // cost 12 ≈ 250ms on modern hardware: slow enough to make offline
        // cracking expensive, fast enough not to stall a sign-up.
        passwordHash: await bcrypt.hash(input.password, 12),
      },
      select: { id: true, name: true, email: true },
    });

    return ok(user, { status: 201 });
  });
}
