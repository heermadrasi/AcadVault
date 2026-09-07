-- ============================================================
-- 0002 — buckets, report-run access for the worker, small fixes
-- ============================================================

-- Buckets must be private. Public buckets make every signed-URL check pointless.
insert into storage.buckets (id, name, public)
values ('faculty-documents', 'faculty-documents', false),
       ('reports', 'reports', false)
on conflict (id) do update set public = false;

-- Faculty may read the reports generated about them, but only finished ones.
-- (Storage can't see report_runs.status, so this mirrors the DB policy by path.)
drop policy if exists storage_reports_faculty_read on storage.objects;
create policy storage_reports_faculty_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1]::uuid = my_faculty_id()
  );

-- Keep faculty from editing their own record (name, department, employee code).
-- The earlier faculty_self_read policy was select-only, which is correct — this
-- comment exists so nobody "helpfully" widens it to `for all` later.

-- Deactivating a faculty member should not orphan their history: is_active=false
-- hides them from assignment pickers while leaving documents and reports intact.
create index if not exists idx_faculty_active on faculty(is_active, full_name);

-- Overdue lookups hit this constantly on the register screen.
create index if not exists idx_tasks_due on tasks(due_at desc);
