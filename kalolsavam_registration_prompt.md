# Prompt: Kalolsavam Student Registration System: St. Joseph's College (Autonomous), Devagiri

## 1. Role and Goal

You are a senior full-stack engineer. Build a production-ready **Kalolsavam Registration Web App** for **St. Joseph's College (Autonomous), Devagiri**.

**Student flow:** A student registers for individual Kalolsavam events, gets a printable PDF registration slip, takes it to the **Head of Department (HOD)** and the **House Coordinator** for signatures, and only then may participate.

**Admin flow:** An admin sees every registration, and can manage (edit/delete), sort, filter, group and export (CSV and PDF) the data.

---

## 2. Tech Stack (use unless you have a strong reason not to)

| Layer | Choice |
|---|---|
| Frontend | React (Vite) or Next.js, Tailwind CSS, mobile-first and responsive |
| Backend / DB | Supabase (PostgreSQL + Row Level Security + Edge Functions) **or** Node/Express + PostgreSQL |
| Validation | Zod (shared client and server schemas) |
| PDF | jsPDF + jspdf-autotable (or pdf-lib), with an embedded **Malayalam-capable font (Noto Sans Malayalam)** |
| CSV | PapaParse or a native implementation |
| Hosting | **Vercel** (frontend and serverless API routes), with the database hosted online (e.g. Supabase) |

Explain any deviation in the README. Whatever the stack, it must deploy cleanly to Vercel.

---

## 3. User Roles

1. **Student (public, no login):** creates one profile per device, views it, edits it, exports the PDF slip.
2. **Admin (authenticated):** full management of registrations, events and exports.

---

## 4. Student Registration Form

| Field | Type | Rules |
|---|---|---|
| Full Name | Text | Required, 2–80 chars, letters/spaces/dots only. Trim whitespace. |
| Association | Single-select dropdown | Required. Choose from the fixed list in §9. |
| Group Name (House) | Read-only text | **Auto-assigned** from the Association via the mapping in §9. Never user-editable. Recomputed **server-side** (never trust the client value). |
| Roll Number | Text | Required, **unique**, placeholder `24USCS10`. Auto-uppercase and trim. Validate with a configurable pattern, e.g. `^\d{2}[A-Z]{2,5}\d{1,4}$`. |
| WhatsApp Number | Tel | Required, **unique**, 10-digit Indian mobile (`^[6-9]\d{9}$`). Accept an optional `+91` and normalize to 10 digits. |
| Phone Number | Tel | Required, **unique**, same validation as above. |
| Email | Email | Required, **unique** (case-insensitive), valid format. |
| Individual Events | Multi-select checkboxes | Required, at least 1. Loaded **dynamically** from the database (active events only). |
| Submit | Button | Disabled while submitting; shows loading, success and error states. |

**Uniqueness rules**
- Roll Number, WhatsApp Number, Phone Number and Email must each be unique **across all students**.
- Enforce with **database UNIQUE constraints**, and also check on the server for friendly errors. The error must name the clashing field, e.g. "This Roll Number is already registered".
- A student's own WhatsApp and Phone may be the same number (the two fields don't clash with each other), but neither may match another student's WhatsApp or Phone. (Confirm this assumption in the README.)
- On edit, exclude the student's own record from the uniqueness check.

**Initial events (seed data; admin can add more later)**

| Malayalam | English |
|---|---|
| പ്രബന്ധരചന ഇംഗ്ലീഷ് | Essay Writing English |
| പ്രബന്ധരചന മലയാളം | Essay Writing Malayalam |
| പ്രബന്ധരചന ഹിന്ദി | Essay Writing Hindi |
| പ്രബന്ധരചന തമിഴ് | Essay Writing Tamil |
| പ്രബന്ധരചന സംസ്കൃതം | Essay Writing Sanskrit |

Display each event as `Malayalam / English`.

---

## 5. Application ID and Device Persistence (critical)

1. On first successful submission the server generates a **unique, permanent Application ID**, e.g. `KAL26-00042` (prefix + year + zero-padded sequence). Use a DB sequence so there are no race conditions.
2. The Application ID **never changes**, even after edits.
3. After submission, store in `localStorage`: `{ applicationId, editToken, profileSnapshot }`.
4. **One device = one profile.** If `localStorage` already holds an Application ID, skip the form and open the profile page. Never show an empty registration form on that device.
5. On load, **re-fetch the latest data from the DB** using the stored Application ID and refresh the local snapshot. If the network fails, show the cached snapshot with an "offline / last synced" notice.
6. **Edit:** the form is pre-filled. On save, update the **database first**, then `localStorage`. The Application ID stays the same.
7. If the record no longer exists in the DB (deleted by admin), clear `localStorage` and show a clear message ("Your registration was removed by the admin. Please register again.").
8. **Security of edit access:** the Application ID alone must not grant edit rights, since IDs are guessable. Generate a random **edit token** (≥128-bit) at creation, store only its **hash** in the DB, and require it for update and read-private calls. The public student API must never allow listing or enumerating other students.
9. Wrap `localStorage` access in try/catch (private mode or quota errors) and show a friendly fallback.

---

## 6. Student Profile Page (after submission)

- Show **every field** interactively: Application ID (prominent badge), Name, Roll Number, Association, Group/House (colour-coded chip: A, B, C, D), WhatsApp, Phone, Email, selected events (as chips), and registered-on / last-updated timestamps.
- Two primary buttons:
  1. **Edit Form** (reopens the pre-filled form).
  2. **Export Form (PDF)** (downloads the slip, see §7).
- A short helper note: *"Print this form, get it signed by your HOD and House Coordinator, then submit it to participate."*

---

## 7. PDF Registration Slip (Printout Design)

A4 portrait, clean, black-and-white print-friendly, **tabular grid layout**.

**Header:** College name, "Kalolsavam [Year] Registration Form", Application ID.

**Grid table (2 columns: label | value, bordered cells):**

| Label | Value |
|---|---|
| Full Name | **UPPERCASE** |
| Roll Number | |
| Association | |
| Group Name | |
| Events | One event per line (Malayalam / English) |

**Signature block (below the events, leave ~3–4 cm of blank space):** split into two halves with a signature line each:
- **Left:** Head of Department
- **Right:** House Coordinator

Add the generated date in the footer. Malayalam text must render correctly (embed the font). The file name should be `Kalolsavam_<ApplicationID>_<RollNo>.pdf`.

---

## 8. Admin Panel

**Authentication:** secure login at `/admin` (Supabase Auth or JWT with httpOnly cookies). Hash passwords with bcrypt/argon2, rate-limit login attempts, and verify admin role **server-side** on every admin API call. No hard-coded credentials.

**Registrations table**
- List **all** registrations with every column: Application ID, Name, Roll No, Association, House, WhatsApp, Phone, Email, Events, Created/Updated.
- **Sort** by any column (asc/desc).
- **Filter** by any column: house, association, event (multi-select), and text search across all fields.
- **Group by** house, association or event (collapsible groups with counts). Note: a student with multiple events appears under each event when grouped by event.
- Pagination or virtual scrolling, plus a total count and filtered count.
- **Edit** any record (same validation and uniqueness rules, and the Application ID is read-only).
- **Delete** a record (confirmation modal; bulk delete with multi-select). Prefer soft-delete or an audit log.

**Event management**
- Add, edit, deactivate/reactivate events (Malayalam name, English name, active flag, display order).
- Deleting an event that has registrations must be blocked or deactivated instead, and old registrations keep their event names.
- Changes appear on the student form immediately with no redeploy.

**Export**
- **CSV:** respects the current filters/sorting; UTF-8 **with BOM** so Malayalam opens correctly in Excel; guard against **CSV/formula injection** (prefix cells beginning with `= + - @` with `'`).
- **PDF:** an attractive report with college header, export date, applied filters, summary stats (total, per house, per event), a striped table with repeating headers and page numbers, optionally grouped by house. Landscape A4. Malayalam font embedded.

**Dashboard (nice to have):** counts by house, association and event with simple charts.

---

## 9. Static Data

### 9.1 Associations and House Mapping (store as a constant/seed table)

| # | Association (dropdown label) | House |
|---|---|---|
| 1 | Botany Association | C |
| 2 | Chemistry Association | D |
| 3 | Commerce Association | A |
| 4 | Economics Association | A |
| 5 | Economics & Mathematics Association | C |
| 6 | English Association | D |
| 7 | Malayalam Association | A |
| 8 | Mathematics Association | B |
| 9 | Physics Association | C |
| 10 | Psychology Association | A |
| 11 | Zoology Association | B |
| 12 | Business Administration (SF) Association | C |
| 13 | Business Administration (International Business) (SF) Association | D |
| 14 | Sports Management (SF) Association | A |
| 15 | Commerce (Computer Application) (SF) Association | A |
| 16 | Commerce (Finance) (SF) Association | B |
| 17 | Computer Science (SF) Association | C |
| 18 | Computer Application (SF) Association | B |
| 19 | Functional English (SF) Association | D |
| 20 | English (SF) Association | D |
| 21 | Applied Mathematics (SF) Association | B |
| 22 | Computer Science & Mathematics (SF) Association | C |
| 23 | Animation & Graphic Design (SF) Association | B |
| 24 | Journalism & Mass Communication (SF) Association | C |
| 25 | Commerce (Professional) (SF) Association | D |
| 26 | Commerce (Applied Finance & Accounting) (SF) Association | D |
| 27 | Social work (SF) Association | A |
| 28 | Statistics (SF) Association | B |

Each house contains exactly 7 associations. Display names as "House A/B/C/D". Keep the mapping in **one** place (a DB table or a single config) so it is easy to change.

---

## 10. Data Model (suggested)

```
associations(id, name UNIQUE, house CHAR(1) CHECK IN ('A','B','C','D'))
events(id, name_ml, name_en, is_active, sort_order, created_at)
students(
  id, application_id UNIQUE, name, roll_number UNIQUE,
  association_id FK, house,            -- derived server-side
  whatsapp UNIQUE, phone UNIQUE, email_lower UNIQUE,
  edit_token_hash, created_at, updated_at
)
student_events(student_id FK, event_id FK, PRIMARY KEY (student_id, event_id))
admins(id, email UNIQUE, password_hash, role)   -- or use the auth provider's users
audit_log(id, actor, action, entity, entity_id, diff, created_at)
```

---

## 11. Security Requirements (implement, then audit)

- **Input validation** on both client and server (Zod); reject unknown fields (mass-assignment protection).
- **Parameterized queries / ORM only**, with no string-built SQL (SQL injection).
- **XSS:** escape all output; never use `dangerouslySetInnerHTML`; set a strict **CSP** and security headers (HSTS, X-Content-Type-Options, frame-ancestors).
- **Authorization:** RLS or server middleware so students can only touch their own record (via edit token) and only admins can list/export/delete.
- **IDOR prevention:** an Application ID alone never grants access (see §5.8).
- **Rate limiting** on registration, edit, lookup and login endpoints, plus bot protection (honeypot field or CAPTCHA) on the public form.
- **CSRF** protection for cookie-based auth; secrets only in environment variables; `.env.example` provided; no secrets in the client bundle.
- **Privacy:** phone numbers and emails are personal data, so expose them only to admins; use HTTPS only.
- **Error handling:** generic error messages to users, detailed logs server-side only.

---

## 12. Debugging and Audit Deliverable

After building, **run a security audit and debug pass**, then include `AUDIT.md` containing:
1. Checklist of the OWASP Top 10 items and how each is addressed.
2. Issues found and fixed (with a before/after note).
3. Test results for the edge cases below.
4. Any remaining known risks.

**Edge cases to test**
- Duplicate Roll No / WhatsApp / Phone / Email (including different letter case, spaces, and `+91` prefixes).
- Two students submitting at the same time (race condition on uniqueness and Application ID).
- Editing then saving without changes; editing to another student's unique value.
- Changing Association during edit, which must update the House.
- `localStorage` cleared, disabled or tampered with (fake Application ID or token).
- Admin deletes a student while the student's device still has cached data.
- Event deactivated after a student has already registered for it.
- Malayalam text in the PDF and CSV; very long names or many events (PDF layout must not overflow).
- Slow or offline network during submit.

---

## 13. UX and Quality Requirements

- Mobile-first, accessible (labels, ARIA, keyboard navigation, sufficient contrast), with inline field-level errors.
- Loading skeletons, toasts and confirmation dialogs for destructive actions.
- Clean, consistent college-themed UI (St. Joseph's branding colours; house colour chips).
- Clean folder structure, typed code, comments for non-obvious logic.

---

## 14. Deliverables

The primary deliverable is a **live, working app hosted on Vercel**, not just source code.

1. **Live Vercel production URL** (`https://<project-name>.vercel.app`) for the student registration site, working end to end (database connected, events seeded, PDF export working).
2. **Admin panel URL** (`https://<project-name>.vercel.app/admin`) with a first admin account created. Share the login details securely (never in the repo or README), and require a password change on first login.
3. **Deployment setup on Vercel:**
   - Framework preset configured, with the production build passing and no build errors.
   - All environment variables set in the Vercel project settings (Production, Preview). Provide a `.env.example` listing them; secrets are never committed.
   - Database hosted online (e.g. Supabase) with the schema and seed data (associations with houses, initial events) already applied.
   - Serverless/Edge API routes used for the backend, so no separate server is needed.
   - HTTPS enforced and security headers set in `vercel.json` or `next.config.js`.
4. **Source repository** (GitHub) connected to Vercel for automatic deploys on push to `main`.
5. **`README.md`:** local setup, env variables, how to redeploy, how to create or reset an admin, and stated assumptions.
6. **`AUDIT.md`** (see §12), run against the **deployed** app.
7. **Smoke-test checklist** completed on the live URL, covering the student flow, the admin flow, and mobile and desktop browsers.

Reply with the live URLs, a short summary of what was built, and any known limitations.

---

## 15. Acceptance Criteria

- [ ] A student can register once per device, view the profile, edit it, and export the PDF slip with signature blocks.
- [ ] The Application ID is generated once and never changes after edits.
- [ ] Duplicate Roll No, WhatsApp, Phone or Email are blocked with a clear message.
- [ ] House is auto-assigned and cannot be tampered with.
- [ ] Admin can list, edit, delete, sort, filter and group by every column, and export CSV and PDF.
- [ ] Admin can add or deactivate events and the student form updates instantly.
- [ ] Malayalam renders correctly in the UI, the PDF slip, the admin PDF and the CSV.
- [ ] The audit report is completed and critical issues are fixed.
- [ ] The app is live on a public Vercel URL, and the student and admin flows work on the deployed site (not only locally).

---

## 16. Open Questions (state your assumption in the README if unanswered)

- Is there one academic-year edition, or must multiple Kalolsavam years be supported?
- Is there a limit on the number of events per student?
- Should the registration have a closing date or an admin on/off switch?
- How many admins are needed, and should there be roles (super admin vs viewer)?
