import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe instance: no Prisma adapter, no providers — just JWT verification.
export default NextAuth(authConfig).auth;

export const config = {
  /**
   * Everything except static assets, the auth endpoints themselves, and the
   * public invitation pages. Keeping `/event/:slug` out of the matcher means a
   * guest never pays for a session check on the page that matters most.
   */
  matcher: ["/((?!api|_next/static|_next/image|uploads|event|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
