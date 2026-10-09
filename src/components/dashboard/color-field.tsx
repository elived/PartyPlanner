"use client";

import { useId } from "react";
import { readableTextColor } from "@/lib/utils";

/**
 * A colour input paired with a hex text field.
 *
 * `<input type="color">` alone is not enough: it has no keyboard-friendly way to
 * enter an exact brand hex, and its native picker is unlabelled. Pairing it with
 * a text field gives both the swatch and an exact, typeable, screen-reader-
 * friendly value — the text field is the labelled control, the swatch is an
 * additional way to reach the same value.
 */
export function ColorField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const valid = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-slate-300">
          <input
            type="color"
            // The swatch duplicates the text field, so it is hidden from the
            // accessibility tree rather than announced as a second control.
            aria-hidden
            tabIndex={-1}
            value={valid ? value : "#000000"}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer border-0 bg-transparent p-0"
          />
        </span>

        <input
          id={id}
          type="text"
          inputMode="text"
          spellCheck={false}
          value={value}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            const next = e.target.value.trim();
            onChange(next.startsWith("#") || next === "" ? next.toUpperCase() : `#${next.toUpperCase()}`);
          }}
          className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase shadow-sm aria-[invalid=true]:border-red-500"
        />

        {valid && (
          <span
            aria-hidden
            className="hidden h-10 shrink-0 place-items-center rounded-lg px-3 text-xs font-semibold sm:grid"
            style={{ background: value, color: readableTextColor(value) }}
          >
            Aa
          </span>
        )}
      </div>

      {hint && !error && <p id={hintId} className="text-xs text-slate-500">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
