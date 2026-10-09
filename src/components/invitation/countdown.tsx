"use client";

import { useEffect, useState } from "react";

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function partsUntil(target: number): Parts | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

/**
 * Live countdown to the event.
 *
 * It renders nothing on the server pass and mounts on the client, because the
 * remaining time is by definition different in each — rendering it server-side
 * guarantees a hydration mismatch and a visible flicker. The date itself is
 * always present in the page above this, so nothing is lost for a visitor
 * without JavaScript.
 */
export function Countdown({ target, label }: { target: Date; label: string }) {
  const targetMs = target.getTime();
  const [parts, setParts] = useState<Parts | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setParts(partsUntil(targetMs));
    const id = setInterval(() => setParts(partsUntil(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (!mounted) {
    // Reserve the space so the layout does not jump when the timer appears.
    return <div aria-hidden className="h-[86px]" />;
  }

  if (!parts) {
    return (
      <p className="pp-heading text-center text-lg font-semibold">
        The wait is over — it&rsquo;s today!
      </p>
    );
  }

  const cells: [number, string][] = [
    [parts.days, parts.days === 1 ? "day" : "days"],
    [parts.hours, "hours"],
    [parts.minutes, "min"],
    [parts.seconds, "sec"],
  ];

  return (
    <div>
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest opacity-70">
        {label}
      </p>
      {/*
        aria-live="off" and a single sr-only summary: announcing a ticking clock
        every second would make the page unusable with a screen reader.
      */}
      <ul aria-hidden className="flex justify-center gap-2 sm:gap-3">
        {cells.map(([value, unit]) => (
          <li
            key={unit}
            className="min-w-[4rem] rounded-[var(--pp-radius)] bg-[rgb(var(--pp-text-rgb)/0.06)] px-3 py-2 text-center"
          >
            <span className="pp-heading block text-2xl font-bold tabular-nums leading-none">
              {String(value).padStart(2, "0")}
            </span>
            <span className="mt-1 block text-[11px] uppercase tracking-wide opacity-70">{unit}</span>
          </li>
        ))}
      </ul>
      <p className="sr-only">
        {parts.days} days, {parts.hours} hours and {parts.minutes} minutes until the event.
      </p>
    </div>
  );
}
