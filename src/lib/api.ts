import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { fieldErrors } from "@/lib/validations/common";

/**
 * A single response envelope for every route handler, so the client's fetch
 * helper only has to understand one shape:
 *   success → { data: T }
 *   failure → { error: string, fields?: Record<string,string> }
 */

export type ApiSuccess<T> = { data: T };
export type ApiFailure = { error: string; fields?: Record<string, string> };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ data }, init);
}

export function fail(
  message: string,
  status = 400,
  fields?: Record<string, string>,
  headers?: Record<string, string>,
) {
  return NextResponse.json<ApiFailure>(
    { error: message, ...(fields ? { fields } : {}) },
    { status, ...(headers ? { headers } : {}) },
  );
}

/** Domain error with an HTTP status attached, thrown from the service layer. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = () => fail("You need to sign in to do that.", 401);
export const forbidden = () => fail("You do not have access to this event.", 403);
export const notFound = (what = "That was not found.") => fail(what, 404);

/**
 * Wraps a handler body so every route reports failures identically and an
 * unexpected exception never leaks a stack trace or SQL to the client.
 */
export async function handle<T>(fn: () => Promise<NextResponse<T> | Response>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Please check the highlighted fields.", 422, fieldErrors(error));
    }
    if (error instanceof AppError) {
      return fail(error.message, error.status, error.fields);
    }
    console.error("[api] unhandled error:", error);
    return fail("Something went wrong on our side. Please try again.", 500);
  }
}

/** Parse a JSON body defensively — a malformed body is a 400, not a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("Expected a JSON request body.", 400);
  }
}
