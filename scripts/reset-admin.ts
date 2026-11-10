/**
 * Create or reset an administrator password.
 *
 * Usage:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:reset
 *
 * Reads .env.local first, then the process environment. The password is hashed
 * with bcrypt (cost 12) and never printed or committed.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}
if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.");
  process.exit(1);
}
if (password.length < 10) {
  console.error("ADMIN_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const adminEmail = email;
const adminPassword = password;

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(adminPassword, 12);
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO admins (email, password_hash, role, must_change_password)
       VALUES ($1, $2, 'admin', FALSE)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = 'admin',
             must_change_password = FALSE
       RETURNING id::text AS id`,
      [adminEmail, hash],
    );
    await client.query(
      `INSERT INTO audit_log (actor, action, entity, entity_id, diff)
       VALUES ($1, 'admin_password_reset', 'admin', $2, '{}'::jsonb)`,
      ["cli:admin-reset", rows[0]!.id],
    );
    await client.query("COMMIT");
    console.log(`Administrator ${adminEmail} is ready.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
