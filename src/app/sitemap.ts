import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/urls";

/**
 * Just the marketing page. Invitation URLs are deliberately absent — listing
 * them in a sitemap would publish exactly the links that are meant to be shared
 * by the organiser, not discovered.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: await getAppOrigin(),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
