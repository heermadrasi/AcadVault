-- ============================================================
-- AcadVault — schema, triggers, RLS
-- Run in Supabase SQL editor. Idempotent-ish; drop & rerun in dev.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------
do $$ begin
  create type user_role         as enum ('admin', 'faculty');
  create type assignment_status as enum ('pending', 'submitted', 'approved', 'rejected');
  create type report_status     as enum ('queued', 'running', 'done', 'failed');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 2. IDENTITY
-- ------------------------------------------------------------

-- Seed this manually with your admin Google emails BEFORE first login.
create table if not exists admin_allowlist (
  email      citext primary key,
  added_at   timestamptz not null default now()
);

-- The "folder". Created by the admin, NOT on first login.
create table if not exists faculty (
  id             uuid primary key default gen_random_uuid(),
  email          citext unique not null,
  full_name      text   not null,
  department     text,
  designation    text,
  employee_code  text unique,
  user_id        uuid unique references auth.users(id) on delete set null, -- null until first login
  first_login_at timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Role lookup for the logged-in user. One row per auth user.
create table if not exists profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      citext not null,
  full_name  text,
  avatar_url text,
  role       user_role not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. SIGNUP GATE
-- Blocks any Google account not pre-provisioned. This is the
-- actual access control — never rely on a client-side check.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role       user_role;
  v_faculty_id uuid;
  v_email      citext := lower(new.email);
begin
  if exists (select 1 from admin_allowlist where email = v_email) then
    v_role := 'admin';
  else
    select id into v_faculty_id from faculty where email = v_email and is_active;
    if v_faculty_id is null then
      raise exception 'ACADVAULT_NOT_PROVISIONED: % is not registered', v_email
        using errcode = '42501';
    end if;
    v_role := 'faculty';
  end if;

  insert into profiles (user_id, email, full_name, avatar_url, role)
  values (
    new.id,
    v_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_role
  );

  if v_role = 'faculty' then
    update faculty
       set user_id        = new.id,
           first_login_at = coalesce(first_login_at, now())
     where id = v_faculty_id;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 4. RLS HELPERS
-- security definer so they don't re-trigger RLS on profiles
-- (which would cause infinite recursion).
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_faculty_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from faculty where user_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- 5. TASKS
-- ------------------------------------------------------------
create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  category        text,                      -- 'FDP Certificate', 'Publication', ...
  due_at          timestamptz not null,
  allow_multiple  boolean not null default false,
  accepted_mime   text[] not null default array['application/pdf'],
  max_size_mb     int    not null default 10,
  created_by      uuid references profiles(user_id),
  created_at      timestamptz not null default now()
);

create table if not exists task_assignments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id)   on delete cascade,
  faculty_id   uuid not null references faculty(id) on delete cascade,
  status       assignment_status not null default 'pending',
  submitted_at timestamptz,
  reviewed_at  timestamptz,
  reviewed_by  uuid references profiles(user_id),
  remarks      text,
  created_at   timestamptz not null default now(),
  unique (task_id, faculty_id)
);

create index if not exists idx_assignments_faculty on task_assignments(faculty_id, status);
create index if not exists idx_assignments_task    on task_assignments(task_id);

-- ------------------------------------------------------------
-- 6. DOCUMENTS
-- storage_path convention: {faculty_id}/{assignment_id|adhoc}/{document_id}.{ext}
-- ------------------------------------------------------------
create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  faculty_id    uuid not null references faculty(id) on delete cascade,
  assignment_id uuid references task_assignments(id) on delete set null,
  category      text,
  title         text not null,
  storage_path  text not null unique,
  mime_type     text not null,
  size_bytes    bigint not null,
  page_count    int,
  version       int not null default 1,
  is_current    boolean not null default true,
  uploaded_by   uuid references auth.users(id),
  uploaded_at   timestamptz not null default now()
);

create index if not exists idx_documents_faculty on documents(faculty_id, is_current);
-- only one current version per assignment when single-file tasks
create unique index if not exists uq_documents_current_assignment
  on documents(assignment_id) where is_current and assignment_id is not null;

-- Flip status when a document lands / is removed.
create or replace function public.sync_assignment_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.assignment_id is not null then
    update task_assignments
       set status = 'submitted', submitted_at = coalesce(submitted_at, now())
     where id = new.assignment_id and status = 'pending';
  elsif tg_op = 'DELETE' and old.assignment_id is not null then
    if not exists (select 1 from documents
                    where assignment_id = old.assignment_id and is_current) then
      update task_assignments
         set status = 'pending', submitted_at = null
       where id = old.assignment_id;
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_sync_assignment_status on documents;
create trigger trg_sync_assignment_status
  after insert or delete on documents
  for each row execute function public.sync_assignment_status();

-- ------------------------------------------------------------
-- 7. REPORT TEMPLATES + RUNS
-- ------------------------------------------------------------
create table if not exists report_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  body_html     text not null,          -- Handlebars source, allowlisted tokens only
  header_html   text,
  footer_html   text default '<div style="font-size:9px;width:100%;text-align:center">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  page_size     text not null default 'A4',
  margins       jsonb not null default '{"top":"20mm","bottom":"18mm","left":"18mm","right":"18mm"}',
  append_files  boolean not null default true,   -- merge the actual uploaded PDFs after the summary
  category_filter text[],                        -- null = all categories
  is_default    boolean not null default false,
  created_by    uuid references profiles(user_id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists uq_one_default_template
  on report_templates(is_default) where is_default;

create table if not exists report_runs (
  id           uuid primary key default gen_random_uuid(),
  faculty_id   uuid not null references faculty(id) on delete cascade,
  template_id  uuid not null references report_templates(id),
  status       report_status not null default 'queued',
  storage_path text,
  error_text   text,
  params       jsonb not null default '{}',   -- {from, to, categories[]}
  requested_by uuid references profiles(user_id),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_report_runs_faculty on report_runs(faculty_id, created_at desc);

-- ------------------------------------------------------------
-- 8. AUDIT LOG (cheap to add, disproportionately impressive)
-- ------------------------------------------------------------
create table if not exists audit_log (
  id         bigserial primary key,
  actor_id   uuid references auth.users(id),
  action     text not null,          -- 'document.upload', 'assignment.approve', ...
  entity     text not null,
  entity_id  uuid,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 9. ADMIN MATRIX VIEW
-- security_invoker so RLS on the base tables still applies.
-- ------------------------------------------------------------
create or replace view task_status_matrix
with (security_invoker = on) as
select
  f.id                as faculty_id,
  f.full_name,
  f.department,
  t.id                as task_id,
  t.title             as task_title,
  t.due_at,
  ta.id               as assignment_id,
  ta.status,
  ta.submitted_at,
  (ta.status = 'pending' and t.due_at < now()) as is_overdue,
  (select count(*) from documents d
    where d.assignment_id = ta.id and d.is_current)      as file_count
from task_assignments ta
join faculty f on f.id = ta.faculty_id
join tasks   t on t.id = ta.task_id;

-- ------------------------------------------------------------
-- 10. RLS
-- ------------------------------------------------------------
alter table faculty          enable row level security;
alter table profiles         enable row level security;
alter table tasks            enable row level security;
alter table task_assignments enable row level security;
alter table documents        enable row level security;
alter table report_templates enable row level security;
alter table report_runs      enable row level security;
alter table audit_log        enable row level security;
alter table admin_allowlist  enable row level security;   -- no policies = admin-API only

-- profiles: read own; admin reads all
create policy profiles_self_read on profiles
  for select using (user_id = auth.uid() or is_admin());

-- faculty: admin full control; faculty reads own row
create policy faculty_admin_all on faculty
  for all using (is_admin()) with check (is_admin());
create policy faculty_self_read on faculty
  for select using (user_id = auth.uid());

-- tasks: admin writes; faculty reads only tasks assigned to them
create policy tasks_admin_all on tasks
  for all using (is_admin()) with check (is_admin());
create policy tasks_faculty_read on tasks
  for select using (exists (
    select 1 from task_assignments ta
     where ta.task_id = tasks.id and ta.faculty_id = my_faculty_id()));

-- assignments: admin writes; faculty reads own
create policy assignments_admin_all on task_assignments
  for all using (is_admin()) with check (is_admin());
create policy assignments_faculty_read on task_assignments
  for select using (faculty_id = my_faculty_id());

-- documents: admin reads all; faculty reads + inserts + deletes own
create policy documents_admin_read on documents
  for select using (is_admin());
create policy documents_faculty_read on documents
  for select using (faculty_id = my_faculty_id());
create policy documents_faculty_insert on documents
  for insert with check (
    faculty_id = my_faculty_id()
    and uploaded_by = auth.uid()
    and (assignment_id is null or exists (
      select 1 from task_assignments ta
       where ta.id = assignment_id and ta.faculty_id = my_faculty_id()))
  );
create policy documents_faculty_delete on documents
  for delete using (
    faculty_id = my_faculty_id()
    and exists (select 1 from task_assignments ta
                 where ta.id = assignment_id and ta.status = 'submitted')
  );  -- can't retract after admin approval

-- templates: admin only
create policy templates_admin_all on report_templates
  for all using (is_admin()) with check (is_admin());

-- report runs: admin all; faculty reads own finished reports
create policy runs_admin_all on report_runs
  for all using (is_admin()) with check (is_admin());
create policy runs_faculty_read on report_runs
  for select using (faculty_id = my_faculty_id() and status = 'done');

-- audit: admin read only; writes go through service role
create policy audit_admin_read on audit_log for select using (is_admin());

-- ------------------------------------------------------------
-- 11. STORAGE
-- Create these buckets in the dashboard first (all PRIVATE):
--   faculty-documents, reports, template-assets
-- ------------------------------------------------------------
create policy storage_docs_faculty_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'faculty-documents'
    and (storage.foldername(name))[1]::uuid = my_faculty_id()
  )
  with check (
    bucket_id = 'faculty-documents'
    and (storage.foldername(name))[1]::uuid = my_faculty_id()
  );

create policy storage_docs_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'faculty-documents' and is_admin());

create policy storage_reports_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'reports' and is_admin());

create policy storage_reports_faculty_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1]::uuid = my_faculty_id()
  );
