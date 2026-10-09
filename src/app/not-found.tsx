import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <PartyPopper aria-hidden className="mx-auto size-10 text-brand-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-2 text-slate-600">
          The invitation may have been unpublished or the link may be mistyped.
          Double-check it with whoever sent it to you.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Back to the start</Button>
        </Link>
      </div>
    </main>
  );
}
