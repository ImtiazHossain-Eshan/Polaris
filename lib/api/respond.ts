import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Consistent API response helpers + a wrapper that turns thrown errors
 * (including our typed HttpError and Zod validation errors) into clean
 * JSON responses, never leaking stack traces.
 */

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

type Handler = (req: Request, ctx: unknown) => Promise<NextResponse> | NextResponse;

export function withErrorHandling(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return fail(err.status, err.message);
      }
      if (err instanceof ZodError) {
        const msg = err.issues
          .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
          .join("; ");
        return fail(400, msg);
      }
      console.error("[api] unhandled error:", err);
      const message = err instanceof Error ? err.message : String(err);
      return fail(500, `Internal error: ${message}`);
    }
  };
}

/** Parse JSON body or throw a 400. */
export async function parseJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
