import { NextResponse, type NextRequest } from "next/server";
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

/**
 * Generic over the route context (`...args`) so it accepts both the
 * legacy no-context handlers and the new Next 15 dynamic routes whose
 * second arg is `{ params: Promise<…> }`. `req` is typed as NextRequest;
 * handlers that only need `Request` remain assignable.
 */
type RouteHandler<A extends unknown[]> = (
  req: NextRequest,
  ...args: A
) => Response | Promise<Response>;

export function withErrorHandling<A extends unknown[]>(
  handler: RouteHandler<A>,
): RouteHandler<A> {
  return async (req, ...args) => {
    try {
      return await handler(req, ...args);
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
      return fail(500, "Something went wrong");
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
