import type { ApiFailure } from "@/lib/api";

/**
 * Thin fetch wrapper for client components. Every route handler answers with
 * `{ data }` or `{ error, fields }`, so this can turn a failure into a typed
 * object instead of every caller re-implementing `res.ok` handling.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    // Offline, DNS failure, request aborted by the browser.
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | { data: T }
    | ApiFailure
    | null;

  if (!response.ok) {
    const failure = (payload ?? {}) as ApiFailure;
    throw new ApiError(
      failure.error ?? "Something went wrong. Please try again.",
      response.status,
      failure.fields,
    );
  }

  return (payload as { data: T }).data;
}

export const apiJson = <T>(url: string, method: string, body: unknown) =>
  apiFetch<T>(url, { method, body: JSON.stringify(body) });
