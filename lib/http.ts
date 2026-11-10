import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError } from "./errors";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

/**
 * Cookie auth is already SameSite=Lax; this is belt-and-braces CSRF protection
 * for state-changing admin routes. Requests without an Origin header (e.g. curl)
 * are allowed, but browser cross-origin requests are rejected.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError("Invalid request origin.", 403, { code: "CSRF" });
  }
  const host = request.headers.get("host");
  if (!host || originHost !== host) {
    throw new AppError("Invalid request origin.", 403, { code: "CSRF" });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("Invalid request body.", 400, { code: "INVALID_BODY" });
  }
}

export function parseWith<T>(schema: ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const field = issue?.path?.[0]?.toString();
      throw new AppError(issue?.message ?? "Please check the form.", 422, {
        code: "VALIDATION",
        field,
      });
    }
    throw error;
  }
}

export function routeError(error: unknown, context: string) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code, field: error.field },
      { status: error.status },
    );
  }
  console.error(`[api:${context}]`, error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", code: "INTERNAL" },
    { status: 500 },
  );
}

export function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
