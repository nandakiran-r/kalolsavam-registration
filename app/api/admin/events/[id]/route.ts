import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  noStore,
  parseWith,
  readJson,
  routeError,
} from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { eventInputSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin({ mutate: true });
    const { id } = await params;
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      throw new AppError("Invalid event.", 400);
    }
    const input = parseWith(eventInputSchema, await readJson(request));
    const { rows } = await query(
      `UPDATE events SET name_ml = $1, name_en = $2, is_active = $3, sort_order = $4
       WHERE id = $5 RETURNING *`,
      [input.nameMl, input.nameEn, input.isActive, input.sortOrder, eventId],
    );
    if (!rows[0]) throw new AppError("Event not found.", 404);
    await query(
      `INSERT INTO audit_log (actor, action, entity, entity_id, diff)
       VALUES ($1, 'event_update', 'event', $2, $3::jsonb)`,
      [`admin:${admin.email}`, String(eventId), JSON.stringify(input)],
    );
    return noStore(NextResponse.json({ event: rows[0] }));
  } catch (error) {
    return routeError(error, "admin.events.update");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin({ mutate: true });
    const { id } = await params;
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      throw new AppError("Invalid event.", 400);
    }

    const used = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM student_events se
       JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
       WHERE se.event_id = $1`,
      [eventId],
    );
    if (Number(used.rows[0]?.count ?? 0) > 0) {
      throw new AppError(
        "This event already has registrations. Deactivate it instead of deleting.",
        409,
        { code: "EVENT_IN_USE" },
      );
    }

    const { rows } = await query(
      "DELETE FROM events WHERE id = $1 RETURNING id, name_en",
      [eventId],
    );
    if (!rows[0]) throw new AppError("Event not found.", 404);
    await query(
      `INSERT INTO audit_log (actor, action, entity, entity_id, diff)
       VALUES ($1, 'event_delete', 'event', $2, $3::jsonb)`,
      [`admin:${admin.email}`, String(eventId), JSON.stringify(rows[0])],
    );
    return noStore(NextResponse.json({ deleted: true }));
  } catch (error) {
    return routeError(error, "admin.events.delete");
  }
}
