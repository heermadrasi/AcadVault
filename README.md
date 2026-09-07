# AcadVault

Faculty document management for an academic department. One admin assigns
document tasks with deadlines; faculty upload what's asked; the admin sees a
submission register for the whole department and can compile any faculty
member's documents into a single PDF report from a template they control.

Next.js 14 (App Router) · Supabase (Postgres + Auth + Storage) · a separate
Node service for PDF rendering.

---

## What changed from the original spec, and why

**Faculty are registered by the admin, not created on first login.** The
original design created a faculty record when they first signed in — which
means you can't assign a task to anyone who hasn't logged in yet, so the system
is unusable on day one. Now the admin creates the faculty record (that record
*is* the "folder"), and Google login links `auth.uid` to it. First login sets
`first_login_at`, nothing more.

**The faculty table doubles as the allowlist.** "Login through Google only" is
not access control — everyone has a Google account. `handle_new_user()` raises
`ACADVAULT_NOT_PROVISIONED` for any email that isn't in `faculty` or
`admin_allowlist`, so unregistered accounts never get a session. The `hd`
parameter passed to Google only pre-filters the account chooser; it is a
convenience, not a gate.

**Folders are a view, not real storage folders.** Files live at
`{faculty_id}/{assignment_id}/{document_id}.ext`. Postgres is the source of
truth and the UI groups by `faculty_id`. Creating actual folder objects means
renames, orphans, and two systems to keep in sync.

**Submission status is derived, then stored.** A trigger on `documents` flips
the assignment to `submitted`. `approved` / `rejected` are admin review states
on top. Setting `status` from the client would leave you with rows claiming
"submitted" and no file behind them.

**Report generation is a queued job on a separate service.** Merging 30
certificates takes 20–60s — past Vercel's function limit. `POST /api/reports`
inserts a `report_runs` row and hands off; the UI polls that row.

---

## Setup

### 1. Supabase

Create a project, then in **SQL Editor** run in order:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_buckets_and_fixes.sql
supabase/seed.sql          # edit the emails first
```

`seed.sql` must contain your own Google address in `admin_allowlist` before you
sign in, or the trigger will lock you out of your own app.

Then **Authentication → Providers → Google**: enable it, paste your Google
Cloud OAuth client ID and secret, and add the callback URL Supabase shows you
to the Google console's *Authorised redirect URIs*.

Storage buckets are created by migration `0002`. Confirm both
`faculty-documents` and `reports` show as **Private**.

### 2. Web app

```bash
cp .env.example .env.local     # fill in from Project Settings → API
npm install
npm run dev
```

### 3. PDF worker

```bash
cd pdf-worker
cp .env.example .env
npm install                   # downloads Chromium, ~150MB
npm run dev
```

Both `PDF_WORKER_SECRET` values must match.

---

## Verifying RLS before you trust the UI

Do this before writing any more features. Sign in as a faculty member, open the
browser console, and try to read someone else's data:

```js
const { data, error } = await supabase.from('documents').select('*')
console.log(data.length)   // must equal only YOUR documents
```

If that returns another faculty member's rows, the UI hiding them is
irrelevant — the API is public. RLS is the security boundary; every route in
this app queries through the user's session precisely so that policy is what
decides.

---

## Layout

```
src/
  middleware.ts              session refresh + coarse route guard
  lib/
    supabase/server.ts       session-scoped client (RLS applies)
    supabase/admin.ts        service-role client (RLS bypassed — route handlers only)
    auth.ts                  requireAdmin / requireFaculty guards
    templateTokens.ts        the token palette offered to the admin
  app/
    admin/                   register, faculty, tasks, templates
    dashboard/               faculty's own task list and uploads
    api/                     mutations (queries happen in Server Components)
pdf-worker/
  src/template.ts            Handlebars + sanitize-html
  src/render.ts              Chrome → cover PDF, with the network blocked
  src/merge.ts               pdf-lib merge, images converted to pages
supabase/migrations/         schema, triggers, RLS, storage policies
```

## The template model

The admin writes HTML with a fixed token palette rather than free-form code:

```hbs
<h1>{{faculty.full_name}}</h1>
<p>{{faculty.designation}}, {{faculty.department}}</p>
{{#each categories}}
  <h3>{{this.name}}</h3>
  {{#each this.documents}}
    <tr><td>{{this.title}}</td><td>{{this.uploaded_on}}</td></tr>
  {{/each}}
{{/each}}
```

Three layers keep this safe, because document titles inside it come from
faculty uploads and are not trusted input:

1. Handlebars escaping stays on — `{{ }}` never `{{{ }}}`.
2. `sanitize-html` strips scripts, event handlers, and any `src`/`href` that
   isn't a `data:` URI.
3. Chrome runs with request interception refusing everything except `data:`,
   so even a leaked URL can't reach the filesystem or the cloud metadata
   endpoint.

Layer 3 is the one that matters. Most HTML-to-PDF services skip it and are
trivially exploitable via `<img src="file:///etc/passwd">`.

## Known gaps

- **Orphaned blobs.** The client uploads to Storage, then inserts the
  `documents` row. If the second call fails the file is stranded. Fix with a
  weekly job that deletes objects with no matching row.
- **No email reminders.** `pg_cron` + an Edge Function + Resend is about three
  hours of work and makes the app feel finished.
- **`audit_log` exists but isn't written to.** Populate it on upload and on
  every status change.
- **Report bookmarks.** `pdf-lib` can't write a PDF outline, so the merged
  report has an index page but no sidebar navigation.
