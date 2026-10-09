import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Middleware already redirects anonymous users, but the check is repeated
  // here on purpose: the layout is the thing that actually reads user data, and
  // a route-level guard should never be the only guard.
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
            <PartyPopper aria-hidden className="size-5 text-brand-600" />
            <span>Party Planner</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {user.name ?? user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
