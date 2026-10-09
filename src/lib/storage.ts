import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage-constants";

/**
 * Image uploads behind a two-driver port.
 *
 *  - `local`       writes to ./public/uploads. Fine for `next dev` and any
 *                  long-lived Node host (Docker, Render, a VPS).
 *  - `vercel-blob` uses Vercel Blob. Required on Vercel, whose filesystem is
 *                  read-only and per-invocation — files written by one request
 *                  simply do not exist for the next one.
 *
 * Organisers can also just paste an image URL, so an instance with neither
 * driver configured is still fully usable.
 */

export { MAX_UPLOAD_BYTES };

export type UploadOutcome =
  | { ok: true; url: string }
  | { ok: false; error: string; status: number };

export function validateUpload(file: File): { ok: true; ext: string } | { ok: false; error: string } {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    return { ok: false, error: "Use a JPEG, PNG, WebP, GIF or AVIF image." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That image is larger than 5 MB." };
  }
  if (file.size === 0) {
    return { ok: false, error: "That file is empty." };
  }
  return { ok: true, ext };
}

export async function storeUpload(file: File, scope: string): Promise<UploadOutcome> {
  const check = validateUpload(file);
  if (!check.ok) return { ok: false, error: check.error, status: 400 };

  // The original filename is never reused — it is attacker-controlled and the
  // source of every classic path-traversal bug in an upload handler.
  const key = `${scope}/${randomUUID()}.${check.ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (env().STORAGE_DRIVER === "vercel-blob") {
    if (!env().BLOB_READ_WRITE_TOKEN) {
      return {
        ok: false,
        status: 500,
        error: "Blob storage is selected but BLOB_READ_WRITE_TOKEN is not set.",
      };
    }
    const { put } = await import("@vercel/blob");
    const blob = await put(key, bytes, {
      access: "public",
      contentType: file.type,
      token: env().BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { ok: true, url: blob.url };
  }

  const dir = path.join(process.cwd(), "public", "uploads", scope);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", key), bytes);
  return { ok: true, url: `/uploads/${key}` };
}
