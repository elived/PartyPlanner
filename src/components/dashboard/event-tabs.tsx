"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "", label: "Details" },
  { segment: "/appearance", label: "Appearance" },
  { segment: "/rsvps", label: "RSVPs" },
] as const;

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/events/${eventId}`;

  return (
    // A tab bar built from links, not ARIA tabs: each panel is its own route, so
    // the browser's back button and deep links work as people expect.
    <nav aria-label="Event sections" className="border-b border-slate-200">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map(({ segment, label }) => {
          const href = `${base}${segment}`;
          const active = pathname === href;
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
