import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import {
  assertSameOrigin,
  getClientIp,
  noStore,
  parseWith,
  readJson,
  routeError,
} from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { adminLoginSchema } from "@/lib/validation";
import { createAdminSession, setSessionCookie } from "@/lib/auth";
import { AppError } from "@/lib/errors";

const DUMMY_HASH = "$2b$12$ObHvamRmUOQ.zCmKzI7tBuxMtwA7Du7u283cbWani3oTeHHrZK0iW";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = getClientIp(request);
    const body = parseWith(adminLoginSchema, await readJson(request));

    const ipLimit = await rateLimit(`admin-login:ip:${ip}`, 10, 15 * 60);
    const emailLimit = await rateLimit(
      `admin-login:email:${body.email}`,
      5,
      15 * 60,
    );
    if (!ipLimit.allowed || !emailLimit.allowed) {
      throw new AppError(
        "Too many sign-in attempts. Please wait 15 minutes and try again.",
        429,
        { code: "RATE_LIMITED" },
      );
    }

    const { rows } = await query<{
      id: string;
      email: string;
      password_hash: string;
      role: "admin" | "viewer";
      must_change_password: boolean;
    }>(
      "SELECT id::text AS id, email, password_hash, role, must_change_password FROM admins WHERE email = $1",
      [body.email],
    );
    const admin = rows[0];
    const valid = await bcrypt.compare(body.password, admin?.password_hash ?? DUMMY_HASH);

    if (!admin || !valid) {
      throw new AppError("Invalid email or password.", 401, {
        code: "INVALID_CREDENTIALS",
      });
    }

    await Promise.all([
      query("DELETE FROM rate_limits WHERE key = $1", [
        `admin-login:email:${body.email}`,
      ]),
      query("UPDATE admins SET last_login_at = NOW() WHERE id = $1", [admin.id]),
    ]);

    const token = await createAdminSession(Number(admin.id));
    await setSessionCookie(token);

    return noStore(
      NextResponse.json({
        admin: {
          id: Number(admin.id),
          email: admin.email,
          role: admin.role,
          mustChangePassword: admin.must_change_password,
        },
      }),
    );
  } catch (error) {
    return routeError(error, "admin.login");
  }
}
