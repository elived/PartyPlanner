import { z } from "zod";

/**
 * Environment access is centralised here so that:
 *  - a missing/typo'd variable fails loudly at boot instead of at 2am in a route handler,
 *  - the rest of the codebase never touches `process.env` directly,
 *  - optional integrations (Google OAuth, Resend, Blob) degrade to a documented default
 *    rather than throwing.
 *
 * `process.env.X` is written out in full rather than destructured because Next.js
 * replaces `NEXT_PUBLIC_*` references statically at build time.
 */

const booleanish = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v === "" ? fallback : v === "true" || v === "1"));

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),

  AUTH_GOOGLE_ID: z.string().optional().default(""),
  AUTH_GOOGLE_SECRET: z.string().optional().default(""),

  ALLOW_PUBLIC_REGISTRATION: booleanish(true),

  EMAIL_PROVIDER: z.enum(["resend", "smtp", "console"]).optional().default("console"),
  EMAIL_FROM: z.string().optional().default("Party Planner <noreply@example.com>"),
  RESEND_API_KEY: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().optional().default(587),
  SMTP_SECURE: booleanish(false),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),

  STORAGE_DRIVER: z.enum(["local", "vercel-blob"]).optional().default("local"),
  BLOB_READ_WRITE_TOKEN: z.string().optional().default(""),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/** Validated server-only environment. Never import this from a client component. */
export function env(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    ALLOW_PUBLIC_REGISTRATION: process.env.ALLOW_PUBLIC_REGISTRATION,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee .env.example.`);
  }

  cached = parsed.data;
  return cached;
}

/**
 * Public origin as known **at build time**. Safe on the client, and the right
 * value for `metadataBase`.
 *
 * Do NOT use it to build links that go into emails, calendar files or anything
 * else a person will click later — it is frozen into the bundle at build time
 * and will be wrong the moment the app is served from a different host. Use
 * `getAppOrigin()` from `@/lib/urls` on the server instead.
 */
export const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const googleAuthEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
