import { BarChart3, CalendarCheck, FileSpreadsheet, Mail, PartyPopper, Palette } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/auth";
import { Button } from "@/components/ui/button";

// The marketing page is the one thing that *should* be findable, so it opts
// back in on top of the app-wide noindex default in the root layout.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

const FEATURES = [
  {
    icon: Palette,
    title: "Design it your way",
    body: "Colours, fonts, button shapes, banner and logo — with a live preview beside the editor.",
  },
  {
    icon: CalendarCheck,
    title: "One shareable link",
    body: "Every event gets its own address, a countdown and a mobile-first RSVP form.",
  },
  {
    icon: Mail,
    title: "Know the moment they reply",
    body: "Email notifications to you, a confirmation receipt to your guest.",
  },
  {
    icon: BarChart3,
    title: "Live head count",
    body: "Attending, maybe, declined and expected attendees, updated as responses land.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export to Excel or CSV",
    body: "Hand the caterer a spreadsheet without retyping a single name.",
  },
  {
    icon: PartyPopper,
    title: "Built for real parties",
    body: "Plus-ones, dietary needs, RSVP deadlines and an optional guest cap.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <PartyPopper aria-hidden className="size-5 text-brand-600" />
          Party Planner
        </span>
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard">
              <Button size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm" variant="ghost">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 pb-20">
        <section className="py-14 text-center sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            Invitations &amp; RSVPs
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl text-balance text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            A beautiful invitation page, and every RSVP in one place.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-slate-600">
            Build the page, share the link, watch the replies arrive. Export the
            guest list when it is time to talk to the caterer.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={user ? "/dashboard" : "/register"}>
              <Button size="lg">{user ? "Open your dashboard" : "Create your first event"}</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Sign in</Button>
            </Link>
          </div>
        </section>

        <section aria-labelledby="features" className="mt-4">
          <h2 id="features" className="sr-only">What you get</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon aria-hidden className="size-4.5" />
                </span>
                <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
