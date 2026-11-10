import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { ADMIN_SESSION_COOKIE } from "./constants";
import { query } from "./db";
import { AppError } from "./errors";

const SESSION_HOURS = 8;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export type AdminSession = {
  id: number;
  email: string;
  role: "admin" | "viewer";
  mustChangePassword: boolean;
};

export async function createAdminSession(adminId: number) {
  return new SignJWT({ role: "admin", scope: "sjc-admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(adminId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  let adminId: number;
  try {
    const verified = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    const scope = verified.payload.scope;
    if (scope !== "sjc-admin") return null;
    adminId = Number(verified.payload.sub);
    if (!Number.isInteger(adminId)) return null;
  } catch {
    return null;
  }

  const { rows } = await query<{
    id: string;
    email: string;
    role: "admin" | "viewer";
    must_change_password: boolean;
  }>(
    "SELECT id, email, role, must_change_password FROM admins WHERE id = $1",
    [adminId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    email: row.email,
    role: row.role,
    mustChangePassword: row.must_change_password,
  };
}

export async function requireAdmin(options: { mutate?: boolean } = {}) {
  const admin = await getAdminSession();
  if (!admin) {
    throw new AppError("Please sign in to continue.", 401, {
      code: "UNAUTHENTICATED",
    });
  }
  if (options.mutate && admin.role !== "admin") {
    throw new AppError("You do not have permission to do that.", 403, {
      code: "FORBIDDEN",
    });
  }
  return admin;
}

export async function verifyPassword(password: string, hash: string) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}
