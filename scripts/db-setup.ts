import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { ASSOCIATIONS, INITIAL_EVENTS } from "../lib/constants";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS application_id_seq START WITH 1 INCREMENT BY 1;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS associations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        house CHAR(1) NOT NULL CHECK (house IN ('A','B','C','D')),
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name_ml TEXT NOT NULL,
        name_en TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS students (
        id BIGSERIAL PRIMARY KEY,
        application_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        roll_number TEXT NOT NULL,
        association_id INTEGER NOT NULL REFERENCES associations(id),
        house CHAR(1) NOT NULL CHECK (house IN ('A','B','C','D')),
        whatsapp VARCHAR(10) NOT NULL,
        phone VARCHAR(10) NOT NULL,
        email TEXT NOT NULL,
        email_lower TEXT NOT NULL,
        edit_token_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE UNIQUE INDEX IF NOT EXISTS students_roll_unique
        ON students (roll_number) WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique
        ON students (email_lower) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS students_house_idx ON students (house);
      CREATE INDEX IF NOT EXISTS students_association_idx ON students (association_id);

      CREATE TABLE IF NOT EXISTS student_contacts (
        number VARCHAR(10) PRIMARY KEY,
        student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS student_contacts_student_idx
        ON student_contacts (student_id);

      CREATE TABLE IF NOT EXISTS student_events (
        student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES events(id),
        PRIMARY KEY (student_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS admins (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','viewer')),
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT,
        diff JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);

      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        window_start TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON rate_limits (expires_at);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (let i = 0; i < ASSOCIATIONS.length; i++) {
      const a = ASSOCIATIONS[i];
      await client.query(
        `INSERT INTO associations (name, house, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE
           SET house = EXCLUDED.house, sort_order = EXCLUDED.sort_order`,
        [a.name, a.house, i + 1],
      );
    }

    const eventCount = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM events",
    );
    if (eventCount.rows[0].count === "0") {
      for (const e of INITIAL_EVENTS) {
        await client.query(
          `INSERT INTO events (name_ml, name_en, sort_order) VALUES ($1, $2, $3)`,
          [e.name_ml, e.name_en, e.sort_order],
        );
      }
    }

    await client.query(
      `INSERT INTO settings (key, value) VALUES ('registration_open', 'true')
       ON CONFLICT (key) DO NOTHING`,
    );

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const existing = await client.query(
        "SELECT id FROM admins WHERE email = $1",
        [adminEmail],
      );
      if (existing.rowCount === 0) {
        const hash = await bcrypt.hash(adminPassword, 12);
        await client.query(
          `INSERT INTO admins (email, password_hash, role, must_change_password)
           VALUES ($1, $2, 'admin', FALSE)`,
          [adminEmail, hash],
        );
        console.log(`Created admin ${adminEmail}`);
      } else {
        console.log(`Admin ${adminEmail} already exists (password left unchanged)`);
      }
    } else {
      console.log(
        "No ADMIN_EMAIL/ADMIN_PASSWORD provided; skipping admin creation.",
      );
    }

    await client.query("COMMIT");
    console.log("Database schema, associations, events and settings are ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
