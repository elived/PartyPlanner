/**
 * Runs once when the server process starts, before it serves a request.
 *
 * The point is to fail (or at least shout) at boot rather than at 2am inside a
 * route handler. A deployment that is missing AUTH_SECRET, or that is silently
 * dropping every notification email, should be obvious from the first lines of
 * the startup log — not discovered by a guest whose RSVP went nowhere.
 */
export async function register() {
  // Only the Node.js server runtime; the edge runtime re-runs this file and has
  // neither the env surface nor a meaningful process lifetime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { env } = await import("@/lib/env");

  // Throws with a readable list of everything that is wrong.
  const config = env();

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return;

  const problems: string[] = [];
  const warnings: string[] = [];

  // The placeholder from .env.example passes the length check, so it would
  // otherwise sail through — and a publicly known signing secret means anyone
  // can mint a session cookie for any account.
  if (config.AUTH_SECRET.includes("replace-me")) {
    problems.push(
      "AUTH_SECRET is still the placeholder from .env.example. Generate one " +
        "with: openssl rand -base64 32",
    );
  }

  // Notification email is a core feature; the console provider means it is
  // being written to stdout and nobody is receiving it.
  if (config.EMAIL_PROVIDER === "console") {
    warnings.push(
      'EMAIL_PROVIDER is "console" — notification and confirmation emails are ' +
        "only printed to the log, not delivered. Set it to \"resend\" or \"smtp\".",
    );
  }
  if (config.EMAIL_PROVIDER === "resend" && !config.RESEND_API_KEY) {
    problems.push('EMAIL_PROVIDER is "resend" but RESEND_API_KEY is empty.');
  }
  if (config.EMAIL_PROVIDER === "smtp" && !config.SMTP_HOST) {
    problems.push('EMAIL_PROVIDER is "smtp" but SMTP_HOST is empty.');
  }

  // Vercel's filesystem is read-only and per-invocation: a file written by one
  // request does not exist for the next. This one is fatal because it fails
  // *silently* at runtime — the upload appears to work and the image 404s.
  if (process.env.VERCEL && config.STORAGE_DRIVER === "local") {
    problems.push(
      'STORAGE_DRIVER is "local", which cannot work on Vercel (read-only, ' +
        'ephemeral filesystem). Use "vercel-blob" and set BLOB_READ_WRITE_TOKEN.',
    );
  }
  if (config.STORAGE_DRIVER === "vercel-blob" && !config.BLOB_READ_WRITE_TOKEN) {
    problems.push('STORAGE_DRIVER is "vercel-blob" but BLOB_READ_WRITE_TOKEN is empty.');
  }

  // Without a runtime origin we cannot build a correct absolute link, and every
  // invitation URL in an email falls back to whatever NEXT_PUBLIC_APP_URL
  // happened to be *at build time*.
  //
  // NEXT_PUBLIC_APP_URL deliberately does not count here: it is inlined during
  // the build, so its presence in the runtime environment proves nothing about
  // the value actually compiled into the bundle.
  const hasRuntimeOrigin = Boolean(process.env.APP_URL || process.env.VERCEL_URL);
  const trustsProxy =
    process.env.AUTH_TRUST_HOST === "1" || process.env.AUTH_TRUST_HOST === "true";
  if (!hasRuntimeOrigin && !trustsProxy) {
    warnings.push(
      "Neither APP_URL nor AUTH_TRUST_HOST is set. Links in notification emails " +
        "and .ics files will use the origin frozen in at build time, which is " +
        "almost certainly not this deployment's domain. Set APP_URL.",
    );
  }

  for (const warning of warnings) console.warn(`[config] ⚠  ${warning}`);

  if (problems.length > 0) {
    throw new Error(
      `Refusing to start with a broken production configuration:\n${problems
        .map((p) => `  • ${p}`)
        .join("\n")}\n\nSee .env.example.`,
    );
  }
}
