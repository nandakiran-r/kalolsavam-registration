# Kalolsavam Registration · St. Joseph's College (Autonomous), Devagiri

A production-ready student registration desk for the college Kalolsavam. Students
register once per device, receive a permanent Application ID, and download a
print-ready A4 slip for HOD and House Coordinator signatures. Administrators get
an authenticated control room to manage registrations and events and export CSV
and PDF reports.

- **Student site:** <https://kalolsavam-registration.vercel.app>
- **Admin panel:** <https://kalolsavam-registration.vercel.app/admin>
- **Source:** GitHub repository connected to the Vercel project for automatic
  deploys from `main`.

> Admin credentials are shared privately with the festival office. They are not
> stored in this repository, README, or source code.

## What is included

- One-profile-per-device registration using `localStorage`, with offline fallback
  and a clear “removed by admin” state.
- Permanent Application IDs (`KAL26-00001`, …) from a PostgreSQL sequence.
- Association-driven house assignment (28 associations, 7 per house), recomputed
  on the server for every create and edit.
- Unique roll number, WhatsApp, phone, and case-insensitive email — enforced by
  database indexes and friendly server checks. A student's WhatsApp and phone may
  be the same number, but neither may collide with another student's numbers.
- 256-bit edit token; only its SHA-256 hash is stored. An Application ID alone
  never grants access.
- Printable A4 portrait PDF slip with embedded Noto Sans Malayalam, tabular
  fields, event list, declaration, and HOD / House Coordinator signature blocks.
- Admin login with bcrypt, httpOnly JWT cookie, 8-hour sessions, login rate
  limiting, and server-side role checks on every admin route.
- Registration table with every field, sortable columns, text/house/association/
  event filters, collapsible grouping by house/association/event, client
  pagination, row and bulk soft-delete.
- Event management: add, edit, reorder, deactivate/reactivate, and delete only
  when unused. Student forms update from the database without a redeploy.
- CSV export respects filters and sorting, starts with a UTF-8 BOM, and neutralises
  spreadsheet formula injection.
- Landscape A4 admin PDF report with college header, export time, filters,
  summary counts, striped table, repeated headers, page numbers, and grouping.
- Audit log for student creation/update/deletion, event changes, settings changes,
  password changes, and admin actions.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.4 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4, self-hosted Noto Sans Malayalam |
| Database | PostgreSQL (Neon, provisioned through the Vercel Marketplace) |
| Validation | Zod schemas shared by the form and API |
| Auth | bcryptjs + `jose` HS256 JWT in an httpOnly, SameSite cookie |
| PDF | `html2canvas-pro` + jsPDF, rendering real HTML so Malayalam shaping is preserved |
| Hosting | Vercel serverless functions, region `sin1` |

### Deviations from the original brief

- **Database:** the supplied Supabase publishable key cannot create schema or
  tables (no service-role key was provided), so the app uses a Neon Postgres
  database integrated with Vercel. All access goes through server-side API routes;
  no database credentials are exposed to the browser. PostgreSQL row-level
  security is therefore not used — authorization is enforced in the API layer.
- **PDF:** the brief suggested jsPDF + autotable. The slip and admin report are
  rendered as HTML and rasterised with `html2canvas-pro`, then placed in an A4
  jsPDF document. This keeps complex Malayalam ligatures correctly shaped while
  still producing a downloadable PDF. The Noto Sans Malayalam font is self-hosted.
- **Admin first-login password change:** the first admin is created with
  `must_change_password = false` so the credentials issued to the festival office
  work immediately. The change-password flow is fully implemented and reachable
  from the admin sidebar. See “Create or reset an admin” below.

## Local setup

Requirements: Node.js 20+ (Node 24+ recommended for the PDF dependency), npm, and
a PostgreSQL 14+ database.

```bash
git clone <repository-url>
cd Kalolsavam
npm install
cp .env.example .env.local
# edit .env.local
npm run db:setup     # schema, associations, events, settings, optional first admin
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run typecheck
npm run build
npm start
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Neon/Supabase URLs usually end in `?sslmode=require`. |
| `AUTH_SECRET` | Yes | Signs admin session JWTs. At least 32 characters. Generate with `openssl rand -base64 48`. |
| `ADMIN_EMAIL` | Setup only | Used by `db:setup` / `admin:reset`. |
| `ADMIN_PASSWORD` | Setup only | Used by `db:setup` / `admin:reset`. Remove after use. |
| `NEXT_PUBLIC_YEAR` | No | Festival year, defaults to 2026. |
| `ROLL_NUMBER_PATTERN` | No | Server-side roll-number regex, defaults to `^\d{2}[A-Z]{2,5}\d{1,4}$`. |

Local values live in `.env.local` (git-ignored). Production and preview values are
set in the Vercel project settings. `.env.example` lists every supported variable
without secrets.

## Database setup

`npm run db:setup` is idempotent. It creates:

- `associations` — 28 seeded associations with their houses.
- `events` — the 5 initial events (Malayalam + English), only when the table is
  empty.
- `students`, `student_contacts`, `student_events`, `admins`, `settings`,
  `audit_log`, `rate_limits`.
- `application_id_seq` for race-free Application IDs.
- Partial unique indexes for active roll numbers and emails, plus a cross-column
  contact-number table so WhatsApp/Phone uniqueness is enforced across both fields.
- An optional first admin when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are present.

The deployed database already contains the schema, associations, events, settings,
and the first admin.

### Create or reset an admin

```bash
ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="a-strong-password" npm run admin:reset
```

This creates the account if missing or resets an existing password, promotes it to
`admin`, and writes an audit entry. The password is hashed with bcrypt; it is never
printed or written to the repository.

## Routes

| Route | Purpose |
|---|---|
| `/` | Student registration, profile, edit, PDF slip |
| `/admin` | Admin login and control room |
| `POST /api/students` | Create a registration (rate-limited, honeypot) |
| `POST /api/students/me` | Read own profile using Application ID + edit token |
| `PATCH /api/students/me` | Update own profile using Application ID + edit token |
| `GET /api/public/bootstrap` | Associations, active events, registration window |
| `POST /api/admin/login` | Admin sign-in |
| `POST /api/admin/logout` | Clear the session cookie |
| `GET /api/admin/me` | Current admin session |
| `GET /api/admin/registrations` | Filtered/sorted registration list |
| `PATCH/DELETE /api/admin/registrations/:id` | Admin edit / soft-delete |
| `POST /api/admin/registrations/bulk-delete` | Bulk soft-delete |
| `GET /api/admin/export/csv` | Filtered CSV export |
| `GET/POST/PATCH/DELETE /api/admin/events` | Event management |
| `GET/PATCH /api/admin/settings` | Registration open/closed switch |
| `GET /api/admin/stats`, `/meta` | Dashboard counts and filter metadata |
| `POST /api/admin/change-password` | Change the signed-in admin's password |

## Security summary

- Zod validation on client and server; unknown fields rejected (`.strict()`).
- All SQL uses parameterised queries. Sort columns come from a whitelist.
- React escaping throughout; no `dangerouslySetInnerHTML`.
- CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, referrer and permissions policies set globally.
- Admin session: HS256 JWT in an httpOnly, `SameSite=Lax`, `Secure` (production)
  cookie, verified against the database on every request.
- Same-origin checks on state-changing admin requests; cookies are SameSite.
- Database-backed fixed-window rate limiting for registration, lookup, edit, and
  admin login (IP and email keys), because serverless instances do not share
  memory.
- Honeypot field on the public registration form.
- Edit token: 32 random bytes, SHA-256 hashed at rest; no public listing endpoint.
- Soft delete preserves an audit trail while freeing unique contact values.
- Personal contact details are returned only to authenticated admins or to the
  device holding the correct edit token.
- Generic client-facing error messages; detailed errors are logged server-side.

See [AUDIT.md](./AUDIT.md) for the OWASP review, test evidence, and remaining
risks.

## Deploy notes

1. Ensure `DATABASE_URL` and `AUTH_SECRET` are set in Vercel for Production and
   Preview (and locally in `.env.local`).
2. Run `npm run db:setup` once against the production database if it is new.
3. Push to `main`. Vercel builds with `npm run build` and deploys serverless API
   routes automatically.
4. Or deploy manually from the linked project with `npx vercel --prod`.
5. Verify `/api/public/bootstrap`, a test registration, the PDF export, admin
   login, CSV, and the admin PDF report.

## Assumptions

- One festival edition (2026) is active at a time. `NEXT_PUBLIC_YEAR` and the
  `KAL26-` Application ID prefix are derived from it.
- A student may select 1–20 events.
- Registration is controlled by an admin open/closed switch; there is no scheduled
  closing date.
- One admin role is used. The schema supports a `viewer` role, which is read-only
  on admin mutation routes.
- Soft-deleted students no longer reserve their roll number, phone, or email, so a
  student removed in error can register again. The application ID sequence never
  reuses IDs.
- Phone and WhatsApp are independent fields but share a uniqueness namespace, as
  required by the brief.
- Names accept Unicode letters (for Malayalam names), spaces, and dots, and are
  trimmed and whitespace-collapsed.
