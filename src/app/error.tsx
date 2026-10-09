"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. In production Next.js replaces `error.message`
 * with a generic string and gives us a `digest` to correlate with the server
 * log, so nothing internal is shown to the visitor.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[boundary]", error);
  }, [error]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <AlertTriangle aria-hidden className="mx-auto size-10 text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-600">
          The page failed to load. Trying again often fixes it.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
        )}
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
