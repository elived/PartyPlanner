"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Copies the invitation link. `navigator.clipboard` needs a secure context and
 * can be refused by the browser, so there is a fallback that selects a hidden
 * input — the organiser always ends up with a way to get the URL.
 */
export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = fallbackRef.current;
      if (!input) return;
      input.select();
      input.setSelectionRange(0, url.length);
      // Deprecated, but it is still the only synchronous fallback that works
      // when the async Clipboard API is unavailable or blocked.
      document.execCommand("copy");
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        onClick={() => void copy()}
        icon={copied ? <Check aria-hidden className="size-4 text-emerald-600" /> : <Copy aria-hidden className="size-4" />}
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
      {/* aria-hidden + tabIndex -1: purely a clipboard fallback target. */}
      <input ref={fallbackRef} value={url} readOnly aria-hidden tabIndex={-1} className="sr-only" />
      <span role="status" className="sr-only">
        {copied ? "Invitation link copied to clipboard" : ""}
      </span>
    </>
  );
}
