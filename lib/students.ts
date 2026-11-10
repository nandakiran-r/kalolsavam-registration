import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./db";
import {
  APP_ID_PREFIX,
  type AssociationRow,
  type EventRow,
  type House,
  type StudentProfile,
} from "./constants";
import { AppError, isUniqueViolation } from "./errors";
import type { StudentInput } from "./validation";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type ProfileRow = {
  id: string;
  application_id: string;
  name: string;
  roll_number: string;
  association_id: number;
  association_name: string;
  house: House;
  whatsapp: string;
  phone: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  events: {
    id: number;
    nameMl: string;
    nameEn: string;
    isActive: boolean;
  }[];
};

const PROFILE_SELECT = `
  SELECT s.id::text AS id, s.application_id, s.name, s.roll_number,
         s.association_id, a.name AS association_name, s.house,
         s.whatsapp, s.phone, s.email, s.created_at, s.updated_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', e.id, 'nameMl', e.name_ml, 'nameEn', e.name_en,
               'isActive', e.is_active
             ) ORDER BY e.sort_order, e.id
           ) FILTER (WHERE e.id IS NOT NULL),
           '[]'::json
         ) AS events
  FROM students s
  JOIN associations a ON a.id = s.association_id
  LEFT JOIN student_events se ON se.student_id = s.id
  LEFT JOIN events e ON e.id = se.event_id
`;

function mapProfile(row: ProfileRow): StudentProfile {
  return {
    id: Number(row.id),
    applicationId: row.application_id,
    name: row.name,
    rollNumber: row.roll_number,
    associationId: row.association_id,
    associationName: row.association_name,
    house: row.house,
    whatsapp: row.whatsapp,
    phone: row.phone,
    email: row.email,
    events: row.events,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getProfileById(id: number) {
  const { rows } = await query<ProfileRow>(
    `${PROFILE_SELECT} WHERE s.id = $1 AND s.deleted_at IS NULL GROUP BY s.id, a.name`,
    [id],
  );
  if (!rows[0]) {
    throw new AppError("Registration not found.", 404, { code: "NOT_FOUND" });
  }
  return mapProfile(rows[0]);
}

export async function getProfileByCredentials(applicationId: string, token: string) {
  const { rows } = await query<{ id: string; deleted_at: Date | null }>(
    `SELECT id::text AS id, deleted_at FROM students
     WHERE application_id = $1 AND edit_token_hash = $2`,
    [applicationId.trim().toUpperCase(), hashToken(token)],
  );
  const row = rows[0];
  if (!row) {
    throw new AppError(
      "We could not find this registration on this device.",
      404,
      { code: "NOT_FOUND" },
    );
  }
  if (row.deleted_at) {
    throw new AppError(
      "Your registration was removed by the admin. Please register again.",
      410,
      { code: "REMOVED" },
    );
  }
  return getProfileById(Number(row.id));
}

export async function getRegistrationOpen() {
  const { rows } = await query<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'registration_open'",
  );
  return rows[0]?.value !== "false";
}

export async function getPublicBootstrap() {
  const [associations, events, open] = await Promise.all([
    query<AssociationRow>(
      "SELECT id, name, house, sort_order FROM associations ORDER BY sort_order, id",
    ),
    query<EventRow>(
      "SELECT id, name_ml, name_en, is_active, sort_order FROM events WHERE is_active = TRUE ORDER BY sort_order, id",
    ),
    getRegistrationOpen(),
  ]);
  return {
    associations: associations.rows,
    events: events.rows,
    registrationOpen: open,
    year: Number(process.env.NEXT_PUBLIC_YEAR || 2026),
  };
}

async function validateAssociationAndEvents(
  client: PoolClient,
  input: StudentInput,
  studentId?: number,
) {
  const association = await client.query<{ id: number; house: House }>(
    "SELECT id, house FROM associations WHERE id = $1",
    [input.associationId],
  );
  if (!association.rows[0]) {
    throw new AppError("Choose a valid association.", 422, {
      code: "VALIDATION",
      field: "associationId",
    });
  }
  const uniqueEventIds = [...new Set(input.eventIds)];
  const events = await client.query<{ id: number }>(
    `SELECT e.id FROM events e
     WHERE e.id = ANY($1::int[])
       AND (
         e.is_active = TRUE
         OR EXISTS (
           SELECT 1 FROM student_events se
           WHERE se.student_id = $2 AND se.event_id = e.id
         )
       )`,
    [uniqueEventIds, studentId ?? null],
  );
  if (events.rowCount !== uniqueEventIds.length) {
    throw new AppError("One or more selected events are no longer available.", 422, {
      code: "VALIDATION",
      field: "eventIds",
    });
  }
  return { association: association.rows[0], eventIds: uniqueEventIds };
}

async function assertUnique(
  client: PoolClient,
  input: StudentInput,
  excludeId?: number,
) {
  const roll = await client.query(
    `SELECT 1 FROM students
     WHERE roll_number = $1 AND deleted_at IS NULL
       AND ($2::bigint IS NULL OR id <> $2) LIMIT 1`,
    [input.rollNumber, excludeId ?? null],
  );
  if (roll.rowCount) {
    throw new AppError("This Roll Number is already registered.", 409, {
      code: "DUPLICATE",
      field: "rollNumber",
    });
  }

  const email = await client.query(
    `SELECT 1 FROM students
     WHERE email_lower = $1 AND deleted_at IS NULL
       AND ($2::bigint IS NULL OR id <> $2) LIMIT 1`,
    [input.email.toLowerCase(), excludeId ?? null],
  );
  if (email.rowCount) {
    throw new AppError("This Email is already registered.", 409, {
      code: "DUPLICATE",
      field: "email",
    });
  }

  const numbers = [...new Set([input.whatsapp, input.phone])];
  const contacts = await client.query<{ number: string }>(
    `SELECT number FROM student_contacts
     WHERE number = ANY($1::varchar[])
       AND ($2::bigint IS NULL OR student_id <> $2)`,
    [numbers, excludeId ?? null],
  );
  if (contacts.rowCount) {
    const clash = contacts.rows[0]!.number;
    const field = clash === input.whatsapp ? "whatsapp" : "phone";
    const label = field === "whatsapp" ? "WhatsApp Number" : "Phone Number";
    throw new AppError(`This ${label} is already registered.`, 409, {
      code: "DUPLICATE",
      field,
    });
  }
}

async function contactConflictError(input: StudentInput, studentId?: number) {
  const numbers = [...new Set([input.whatsapp, input.phone])];
  const contacts = await query<{ number: string }>(
    `SELECT number FROM student_contacts
     WHERE number = ANY($1::varchar[])
       AND ($2::bigint IS NULL OR student_id <> $2) LIMIT 1`,
    [numbers, studentId ?? null],
  );
  if (contacts.rows[0]) {
    const field =
      contacts.rows[0].number === input.whatsapp ? "whatsapp" : "phone";
    const label = field === "whatsapp" ? "WhatsApp Number" : "Phone Number";
    return new AppError(`This ${label} is already registered.`, 409, {
      code: "DUPLICATE",
      field,
    });
  }
  return new AppError(
    "One of these contact numbers is already registered.",
    409,
    { code: "DUPLICATE" },
  );
}

function mapStudentUniqueError(error: unknown): AppError | null {
  if (!isUniqueViolation(error)) return null;
  if (error.constraint === "students_roll_unique") {
    return new AppError("This Roll Number is already registered.", 409, {
      code: "DUPLICATE",
      field: "rollNumber",
    });
  }
  if (error.constraint === "students_email_unique") {
    return new AppError("This Email is already registered.", 409, {
      code: "DUPLICATE",
      field: "email",
    });
  }
  return null;
}

async function writeAudit(
  client: PoolClient,
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  diff: unknown,
) {
  await client.query(
    `INSERT INTO audit_log (actor, action, entity, entity_id, diff)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [actor, action, entity, entityId, JSON.stringify(diff)],
  );
}

async function replaceContacts(
  client: PoolClient,
  studentId: number,
  input: StudentInput,
) {
  await client.query("DELETE FROM student_contacts WHERE student_id = $1", [
    studentId,
  ]);
  const numbers = [...new Set([input.whatsapp, input.phone])];
  for (const number of numbers) {
    await client.query(
      "INSERT INTO student_contacts (number, student_id) VALUES ($1, $2)",
      [number, studentId],
    );
  }
}

async function replaceEvents(
  client: PoolClient,
  studentId: number,
  eventIds: number[],
) {
  await client.query("DELETE FROM student_events WHERE student_id = $1", [
    studentId,
  ]);
  for (const eventId of eventIds) {
    await client.query(
      "INSERT INTO student_events (student_id, event_id) VALUES ($1, $2)",
      [studentId, eventId],
    );
  }
}

export async function createRegistration(input: StudentInput) {
  const editToken = randomBytes(32).toString("base64url");
  const editTokenHash = hashToken(editToken);

  let studentId: number;
  try {
    studentId = await withTransaction(async (client) => {
      const { association, eventIds } = await validateAssociationAndEvents(
        client,
        input,
      );
      await assertUnique(client, input);

      const sequence = await client.query<{ n: string }>(
        "SELECT nextval('application_id_seq')::text AS n",
      );
      const applicationId = `${APP_ID_PREFIX}-${String(
        Number(sequence.rows[0]!.n),
      ).padStart(5, "0")}`;

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO students
           (application_id, name, roll_number, association_id, house,
            whatsapp, phone, email, email_lower, edit_token_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id::text AS id`,
        [
          applicationId,
          input.name,
          input.rollNumber,
          input.associationId,
          association.house,
          input.whatsapp,
          input.phone,
          input.email,
          input.email.toLowerCase(),
          editTokenHash,
        ],
      );
      const id = Number(inserted.rows[0]!.id);
      await replaceContacts(client, id, input);
      await replaceEvents(client, id, eventIds);
      await writeAudit(client, `student:${applicationId}`, "create", "student", String(id), {
        applicationId,
        name: input.name,
        rollNumber: input.rollNumber,
        eventIds,
      });
      return id;
    });
  } catch (error) {
    const mapped = mapStudentUniqueError(error);
    if (mapped) throw mapped;
    if (isUniqueViolation(error) && error.constraint === "student_contacts_pkey") {
      throw await contactConflictError(input);
    }
    throw error;
  }

  return {
    profile: await getProfileById(studentId),
    editToken,
  };
}

export async function updateRegistration(
  applicationId: string,
  token: string,
  input: StudentInput,
) {
  const found = await query<{ id: string; deleted_at: Date | null }>(
    `SELECT id::text AS id, deleted_at FROM students
     WHERE application_id = $1 AND edit_token_hash = $2`,
    [applicationId.trim().toUpperCase(), hashToken(token)],
  );
  if (!found.rows[0]) {
    throw new AppError(
      "We could not find this registration on this device.",
      404,
      { code: "NOT_FOUND" },
    );
  }
  if (found.rows[0].deleted_at) {
    throw new AppError(
      "Your registration was removed by the admin. Please register again.",
      410,
      { code: "REMOVED" },
    );
  }
  const studentId = Number(found.rows[0].id);

  try {
    await withTransaction(async (client) => {
      const { association, eventIds } = await validateAssociationAndEvents(
        client,
        input,
        studentId,
      );
      await assertUnique(client, input, studentId);
      await client.query(
        `UPDATE students SET
           name = $1, roll_number = $2, association_id = $3, house = $4,
           whatsapp = $5, phone = $6, email = $7, email_lower = $8,
           updated_at = NOW()
         WHERE id = $9`,
        [
          input.name,
          input.rollNumber,
          input.associationId,
          association.house,
          input.whatsapp,
          input.phone,
          input.email,
          input.email.toLowerCase(),
          studentId,
        ],
      );
      await replaceContacts(client, studentId, input);
      await replaceEvents(client, studentId, eventIds);
      await writeAudit(
        client,
        `student:${applicationId}`,
        "update",
        "student",
        String(studentId),
        { name: input.name, associationId: input.associationId, eventIds },
      );
    });
  } catch (error) {
    const mapped = mapStudentUniqueError(error);
    if (mapped) throw mapped;
    if (isUniqueViolation(error) && error.constraint === "student_contacts_pkey") {
      throw await contactConflictError(input, studentId);
    }
    throw error;
  }

  return getProfileById(studentId);
}

export type AdminFilters = {
  house?: string;
  associationId?: number;
  eventIds?: number[];
  q?: string;
  sort?: string;
  dir?: "asc" | "desc";
};

const SORT_COLUMNS: Record<string, string> = {
  applicationId: "s.application_id",
  name: "s.name",
  rollNumber: "s.roll_number",
  association: "a.name",
  house: "s.house",
  whatsapp: "s.whatsapp",
  phone: "s.phone",
  email: "s.email_lower",
  events: "MIN(e.sort_order)",
  createdAt: "s.created_at",
  updatedAt: "s.updated_at",
};

export async function listRegistrations(filters: AdminFilters) {
  const conditions = ["s.deleted_at IS NULL"];
  const values: unknown[] = [];

  if (filters.house && ["A", "B", "C", "D"].includes(filters.house)) {
    values.push(filters.house);
    conditions.push(`s.house = $${values.length}`);
  }
  if (filters.associationId) {
    values.push(filters.associationId);
    conditions.push(`s.association_id = $${values.length}`);
  }
  if (filters.eventIds?.length) {
    values.push(filters.eventIds);
    conditions.push(
      `EXISTS (SELECT 1 FROM student_events se2
               WHERE se2.student_id = s.id AND se2.event_id = ANY($${values.length}::int[]))`,
    );
  }
  if (filters.q?.trim()) {
    values.push(`%${filters.q.trim()}%`);
    const p = `$${values.length}`;
    conditions.push(`(
      s.name ILIKE ${p} OR s.roll_number ILIKE ${p} OR s.application_id ILIKE ${p}
      OR s.email_lower ILIKE ${p} OR s.whatsapp ILIKE ${p} OR s.phone ILIKE ${p}
      OR a.name ILIKE ${p}
      OR EXISTS (
        SELECT 1 FROM student_events se3 JOIN events e3 ON e3.id = se3.event_id
        WHERE se3.student_id = s.id AND (e3.name_ml ILIKE ${p} OR e3.name_en ILIKE ${p})
      )
    )`);
  }

  const where = conditions.join(" AND ");
  const sortColumn = SORT_COLUMNS[filters.sort ?? "createdAt"] ?? SORT_COLUMNS.createdAt;
  const dir = filters.dir === "asc" ? "ASC" : "DESC";

  const [rows, total] = await Promise.all([
    query<ProfileRow>(
      `${PROFILE_SELECT}
       WHERE ${where}
       GROUP BY s.id, a.name
       ORDER BY ${sortColumn} ${dir} NULLS LAST, s.id DESC`,
      values,
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM students s
       JOIN associations a ON a.id = s.association_id
       WHERE ${where}`,
      values,
    ),
  ]);

  return {
    registrations: rows.rows.map(mapProfile),
    totalCount: Number(total.rows[0]?.count ?? 0),
  };
}

export async function getRegistrationById(id: number) {
  return getProfileById(id);
}

export async function adminUpdateRegistration(
  id: number,
  input: StudentInput,
  actor: string,
) {
  const existing = await query<{ id: string; application_id: string }>(
    "SELECT id::text AS id, application_id FROM students WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  if (!existing.rows[0]) {
    throw new AppError("Registration not found.", 404, { code: "NOT_FOUND" });
  }

  try {
    await withTransaction(async (client) => {
      const { association, eventIds } = await validateAssociationAndEvents(
        client,
        input,
        id,
      );
      await assertUnique(client, input, id);
      await client.query(
        `UPDATE students SET
           name = $1, roll_number = $2, association_id = $3, house = $4,
           whatsapp = $5, phone = $6, email = $7, email_lower = $8,
           updated_at = NOW()
         WHERE id = $9`,
        [
          input.name,
          input.rollNumber,
          input.associationId,
          association.house,
          input.whatsapp,
          input.phone,
          input.email,
          input.email.toLowerCase(),
          id,
        ],
      );
      await replaceContacts(client, id, input);
      await replaceEvents(client, id, eventIds);
      await writeAudit(client, actor, "admin_update", "student", String(id), {
        applicationId: existing.rows[0].application_id,
        name: input.name,
        associationId: input.associationId,
        eventIds,
      });
    });
  } catch (error) {
    const mapped = mapStudentUniqueError(error);
    if (mapped) throw mapped;
    if (isUniqueViolation(error) && error.constraint === "student_contacts_pkey") {
      throw await contactConflictError(input, id);
    }
    throw error;
  }

  return getProfileById(id);
}

export async function softDeleteRegistrations(ids: number[], actor: string) {
  if (!ids.length) return 0;
  return withTransaction(async (client) => {
    const found = await client.query<{
      id: string;
      application_id: string;
      name: string;
      roll_number: string;
    }>(
      `SELECT id::text AS id, application_id, name, roll_number
       FROM students WHERE id = ANY($1::bigint[]) AND deleted_at IS NULL`,
      [ids],
    );
    if (!found.rowCount) return 0;

    const foundIds = found.rows.map((row) => Number(row.id));
    await client.query(
      "UPDATE students SET deleted_at = NOW(), updated_at = NOW() WHERE id = ANY($1::bigint[])",
      [foundIds],
    );
    await client.query(
      "DELETE FROM student_contacts WHERE student_id = ANY($1::bigint[])",
      [foundIds],
    );
    for (const row of found.rows) {
      await writeAudit(client, actor, "delete", "student", row.id, {
        applicationId: row.application_id,
        name: row.name,
        rollNumber: row.roll_number,
      });
    }
    return found.rowCount;
  });
}

export async function getAdminRegistrationsMeta() {
  const [events, associations, total, open] = await Promise.all([
    query<EventRow & { registrationCount: number }>(
      `SELECT e.id, e.name_ml, e.name_en, e.is_active, e.sort_order,
              COUNT(DISTINCT s.id)::int AS "registrationCount"
       FROM events e
       LEFT JOIN student_events se ON se.event_id = e.id
       LEFT JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
       GROUP BY e.id
       ORDER BY e.sort_order, e.id`,
    ),
    query<AssociationRow>(
      "SELECT id, name, house, sort_order FROM associations ORDER BY sort_order, id",
    ),
    query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM students WHERE deleted_at IS NULL",
    ),
    getRegistrationOpen(),
  ]);
  return {
    events: events.rows,
    associations: associations.rows,
    totalRegistrations: Number(total.rows[0]?.count ?? 0),
    registrationOpen: open,
  };
}

export async function getStats() {
  const [byHouse, byAssociation, byEvent, totals, recent] = await Promise.all([
    query<{ house: House; count: number }>(
      `SELECT house, COUNT(*)::int AS count FROM students
       WHERE deleted_at IS NULL GROUP BY house ORDER BY house`,
    ),
    query<{ name: string; house: House; count: number }>(
      `SELECT a.name, a.house, COUNT(s.id)::int AS count
       FROM associations a
       LEFT JOIN students s ON s.association_id = a.id AND s.deleted_at IS NULL
       GROUP BY a.id, a.name, a.house
       ORDER BY count DESC, a.name`,
    ),
    query<{ id: number; name_en: string; name_ml: string; count: number }>(
      `SELECT e.id, e.name_en, e.name_ml, COUNT(s.id)::int AS count
       FROM events e
       LEFT JOIN student_events se ON se.event_id = e.id
       LEFT JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
       GROUP BY e.id, e.name_en, e.name_ml
       ORDER BY e.sort_order, e.id`,
    ),
    query<{ total: number; today: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS today
       FROM students WHERE deleted_at IS NULL`,
    ),
    query<{
      id: string;
      application_id: string;
      name: string;
      house: House;
      created_at: Date;
    }>(
      `SELECT id::text AS id, application_id, name, house, created_at
       FROM students WHERE deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 8`,
    ),
  ]);

  return {
    byHouse: byHouse.rows,
    byAssociation: byAssociation.rows,
    byEvent: byEvent.rows,
    total: totals.rows[0]?.total ?? 0,
    today: totals.rows[0]?.today ?? 0,
    recent: recent.rows.map((row) => ({
      ...row,
      created_at: new Date(row.created_at).toISOString(),
    })),
  };
}

export async function setRegistrationOpen(open: boolean, actor: string) {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('registration_open', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [open ? "true" : "false"],
    );
    await writeAudit(client, actor, "settings_update", "settings", "registration_open", {
      value: open,
    });
  });
}

export async function getAuditLog(limit = 20) {
  const { rows } = await query(
    `SELECT id::text AS id, actor, action, entity, entity_id, diff, created_at
     FROM audit_log ORDER BY created_at DESC LIMIT $1`,
    [Math.min(Math.max(limit, 1), 100)],
  );
  return rows;
}
