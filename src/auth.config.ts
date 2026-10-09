import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the auth configuration.
 *
 * Next.js middleware runs on the edge runtime, where Prisma (and bcrypt) cannot
 * run. Auth.js's documented answer is to split the config: this file holds only
 * what the middleware needs (pages, cookie/session shape, the `authorized`
 * callback), and `src/auth.ts` adds the database adapter and providers for the
 * Node runtime. Both halves share the same JWT, so the middleware can read the
 * session without touching the database at all.
 */
/**
 * Auth.js refuses to build callback URLs from the request's Host header unless
 * it trusts the host — otherwise a forged Host turns into an open redirect on
 * the sign-in callback. It auto-trusts on Vercel; anywhere else (Docker, a VPS,
 * `next start` behind nginx) sign-in returns "problem with the server
 * configuration" until this is set. Hence the explicit, documented opt-in.
 */
const trustHost =
  process.env.AUTH_TRUST_HOST === "1" ||
  process.env.AUTH_TRUST_HOST === "true" ||
  Boolean(process.env.VERCEL) ||
  process.env.NODE_ENV !== "production";

export const authConfig = {
  trustHost,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  // Providers are attached in src/auth.ts; the middleware never needs them.
  providers: [],
  callbacks: {
    /**
     * Gate for the middleware matcher. Returning `false` redirects to `pages.signIn`
     * with a callbackUrl, so a deep link into the dashboard survives sign-in.
     */
    authorized({ auth, request }) {
      const isSignedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/dashboard")) return isSignedIn;

      // Signed-in users have no business on the sign-in screen.
      if (isSignedIn && (pathname === "/login" || pathname === "/register")) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
