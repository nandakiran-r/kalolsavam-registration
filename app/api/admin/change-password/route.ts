import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import {
  assertSameOrigin,
  noStore,
  parseWith,
  readJson,
  routeError,
} from "@/lib/http";
import { hashPassword, requireAdmin, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin({ mutate: true });
    const body = parseWith(changePasswordSchema, await readJson(request));

    const { rows } = await query<{ password_hash: string }>(
      "SELECT password_hash FROM admins WHERE id = $1",
      [admin.id],
    );
    const currentHash = rows[0]?.password_hash;
    if (!currentHash || !(await verifyPassword(body.currentPassword, currentHash))) {
      throw new AppError("Your current password is incorrect.", 400, {
        code: "INVALID_PASSWORD",
        field: "currentPassword",
      });
    }
    if (await bcrypt.compare(body.newPassword, currentHash)) {
      throw new AppError("Choose a password different from your current one.", 400, {
        code: "SAME_PASSWORD",
        field: "newPassword",
      });
    }

    const newHash = await hashPassword(body.newPassword);
    await query(
      "UPDATE admins SET password_hash = $1, must_change_password = FALSE WHERE id = $2",
      [newHash, admin.id],
    );
    await query(
      `INSERT INTO audit_log (actor, action, entity, entity_id, diff)
       VALUES ($1, 'password_change', 'admin', $2, '{}'::jsonb)`,
      [`admin:${admin.email}`, String(admin.id)],
    );

    return noStore(NextResponse.json({ ok: true }));
  } catch (error) {
    return routeError(error, "admin.change-password");
  }
}
