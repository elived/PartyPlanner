"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import { MAX_UPLOAD_BYTES } from "@/lib/storage-constants";
import { formatBytes } from "@/lib/utils";

/**
 * Upload a file *or* paste a URL.
 *
 * Both paths end at the same place — a string on the event — which means an
 * instance with no storage configured is still fully usable, and an organiser
 * who already hosts their artwork somewhere is not forced to re-upload it.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
  aspect = "banner",
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
  aspect?: "banner" | "square";
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That image is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const { url } = await apiFetch<{ url: string }>("/api/uploads", { method: "POST", body });
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      // Clear the input so re-selecting the same file fires change again.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      {value && (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied host */}
          <img
            src={value}
            alt=""
            className={aspect === "banner" ? "h-28 w-full object-cover" : "mx-auto size-24 object-contain p-2"}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
          >
            <X aria-hidden className="size-4" />
            <span className="sr-only">Remove {label.toLowerCase()}</span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="url"
          placeholder="https://example.com/image.jpg"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm shadow-sm"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {uploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}
