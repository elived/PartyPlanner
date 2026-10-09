import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { googleAuthEnabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validations/auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

/**
 * A bcrypt comparison against a fixed dummy hash. Running it when the account
 * does not exist keeps the response time for "unknown email" and "wrong
 * password" the same, so the endpoint can't be used to enumerate users.
 */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // The adapter persists OAuth accounts and links them to users. With
  // `strategy: "jwt"` it is not used for session storage — credentials sign-in
  // requires JWT sessions, and Auth.js does not support mixing the two.
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        if (!user?.passwordHash || !ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
    ...(googleAuthEnabled ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      // `user` is only present on the sign-in pass; afterwards the id rides
      // along in the token so no database round-trip is needed per request.
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** Session for a route/server component, or `null`. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
