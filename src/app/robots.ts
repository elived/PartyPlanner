import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/urls";

/**
 * Only the marketing page is crawlable.
 *
 * Invitation pages are unauthenticated but not *public* in the search-engine
 * sense: the URL is the secret, and the page shows a venue address, the host's
 * phone number and a live head count. Indexing them would turn "anyone with the
 * link" into "anyone who searches for the venue".
 *
 * robots.txt is a request, not an access control — the pages also send
 * `noindex` via the root layout's metadata, which is what actually keeps a
 * well-behaved crawler from listing them.
 *
 * If you are running this for events that *should* be findable (a public
 * conference, say), remove `/event/` from `disallow` and set
 * `robots: { index: true }` in `src/app/event/[slug]/page.tsx`.
 */
// Resolved per request so a runtime-only APP_URL is reflected here too.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getAppOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/event/", "/login", "/register", "/uploads/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
