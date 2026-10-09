/**
 * Upload limits shared by the client picker and the server handler.
 *
 * They live in their own module because `src/lib/storage.ts` is marked
 * `server-only` — importing the limit from there would drag the Node `fs` code
 * into the browser bundle (and fail the build).
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  // SVG is deliberately absent: it can carry <script>, and with the `local`
  // driver uploads are served from our own origin, which would turn a logo
  // upload into stored XSS.
};

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_IMAGE_TYPES).join(",");
