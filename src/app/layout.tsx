import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { appUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Party Planner",
    template: "%s · Party Planner",
  },
  description: "Create a beautiful invitation page and collect RSVPs in one place.",
  // Deliberately NOT indexable by default. An invitation carries a street
  // address, the host's phone number and, once responses land, guest names —
  // none of which belongs in a search index just because the link is
  // unauthenticated. Individual public pages opt in; see src/app/robots.ts.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7C3AED",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (password managers, Grammarly)
    // commonly inject attributes on <html> before React hydrates.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
