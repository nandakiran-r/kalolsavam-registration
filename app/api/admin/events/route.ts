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

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const { rows } = await query(
      `SELECT e.id, e.name_ml, e.name_en, e.is_active, e.sort_order, e.created_at,
              COUNT(DISTINCT s.id)::int AS "registrationCount"
       FROM events e
       LEFT JOIN student_events se ON se.event_id = e.id
       LEFT JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
       GROUP BY e.id
       ORDER BY e.sort_order, e.id`,
    );
    return noStore(NextResponse.json({ events: rows }));
  } catch (error) {
    return routeError(error, "admin.events.list");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin({ mutate: true });
    const input = parseWith(eventInputSchema, await readJson(request));
    const { rows } = await query(
      `INSERT INTO events (name_ml, name_en, is_active, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.nameMl, input.nameEn, input.isActive, input.sortOrder],
    );
    await query(
      `INSERT INTO audit_log (actor, action, entity, entity_id, diff)
       VALUES ($1, 'event_create', 'event', $2, $3::jsonb)`,
      [`admin:${admin.email}`, String(rows[0].id), JSON.stringify(input)],
    );
    return noStore(NextResponse.json({ event: rows[0] }, { status: 201 }));
  } catch (error) {
    return routeError(error, "admin.events.create");
  }
}
