import "server-only";
import { headers } from "next/headers";
import { appUrl } from "@/lib/env";

/**
 * Resolving the public origin of this deployment, at request time.
 *
 * Why this exists
 * ---------------
 * `NEXT_PUBLIC_APP_URL` is inlined into the bundle **at build time**. That is
 * fine for the browser, but it means a server rendering on a different host than
 * the one it was built for emits wrong links — the invitation URL in a
 * notification email, the dashboard link, the URL inside the .ics file. One
 * image, one domain, forever; change the domain and you must rebuild.
 *
 * Why we do not just trust the Host header
 * ----------------------------------------
 * `Host` / `X-Forwarded-Host` are attacker-controlled unless something in front
 * of the app overwrites them. Building an *email* link out of an unvalidated
 * Host is the classic host-header-injection bug: send an RSVP with a forged
 * Host and the organiser gets a mail pointing at your domain. So the header is
 * used only when the operator has explicitly said their proxy is trustworthy.
 *
 * Resolution order (first match wins):
 *   1. APP_URL              — runtime, server-only. The canonical answer.
 *   2. Vercel's own vars    — set by the platform, not by the client.
 *   3. Forwarded/Host header — only when AUTH_TRUST_HOST is set.
 *   4. NEXT_PUBLIC_APP_URL  — build-time value, as a last resort.
 *   5. http://localhost:3000 — development.
 */

const strip = (url: string) => url.replace(/\/+$/, "");

function configuredOrigin(): string | null {
  if (process.env.APP_URL) return strip(process.env.APP_URL);

  // Set by Vercel. PROJECT_PRODUCTION_URL is the stable custom domain;
  // VERCEL_URL is the per-deployment URL and is the right answer for previews.
  const vercel =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;
  if (vercel) return `https://${strip(vercel)}`;

  return null;
}

const trustsProxyHeaders =
  process.env.AUTH_TRUST_HOST === "1" ||
  process.env.AUTH_TRUST_HOST === "true" ||
  process.env.NODE_ENV !== "production";

/**
 * The origin to build absolute links with. Call from a Server Component or a
 * route handler — it reads request headers, so it cannot be used at module
 * scope or inside `unstable_cache`.
 */
export async function getAppOrigin(): Promise<string> {
  const configured = configuredOrigin();
  if (configured) return configured;

  if (trustsProxyHeaders) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      // A comma-separated chain means several proxies appended to it; the
      // left-most entry is the one closest to the client.
      const proto =
        h.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
        (isLocal(host) ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  return appUrl;
}

function isLocal(host: string): boolean {
  const name = host.split(":")[0] ?? "";
  return name === "localhost" || name === "127.0.0.1" || name.endsWith(".local");
}

/** Absolute URL for `path` on this deployment. */
export async function appUrlFor(path: string): Promise<string> {
  const origin = await getAppOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
