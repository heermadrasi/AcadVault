import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, Stamp, EmptyState, Stat } from "@/components/ui";
import { DownloadLink } from "@/components/DownloadLink";
import { ReviewControls } from "@/components/ReviewControls";
import { ReportButton } from "@/components/ReportButton";
import { fmtDate, fmtDateTime, fmtSize, dueLabel } from "@/lib/format";
import { DOC_BUCKET, type Faculty, type ReportTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string; status: string; submitted_at: string | null; remarks: string | null;
  tasks: { id: string; title: string; category: string | null; due_at: string } | null;
  documents: {
    id: string; title: string; storage_path: string; mime_type: string;
    size_bytes: number; uploaded_at: string; version: number; is_current: boolean;
  }[];
};

/** The "folder": one faculty, everything they've filed, grouped by task. */
export default async function FacultyFolder({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: facultyRow } = await supabase
    .from("faculty").select("*").eq("id", params.id).maybeSingle();
  if (!facultyRow) notFound();
  const faculty = facultyRow as Faculty;

  const [{ data: assignments }, { data: templateRows }, { data: adhoc }] = await Promise.all([
    supabase
      .from("task_assignments")
      .select(`id, status, submitted_at, remarks,
               tasks ( id, title, category, due_at ),
               documents ( id, title, storage_path, mime_type, size_bytes, uploaded_at, version, is_current )`)
      .eq("faculty_id", params.id),
    supabase.from("report_templates").select("*").order("is_default", { ascending: false }),
    supabase
      .from("documents").select("*")
      .eq("faculty_id", params.id).is("assignment_id", null).eq("is_current", true),
  ]);

  const rows = ((assignments ?? []) as unknown as Row[]).sort((a, b) =>
    (a.tasks?.due_at ?? "").localeCompare(b.tasks?.due_at ?? "")
  );
  const templates = (templateRows ?? []) as ReportTemplate[];

  const filed = rows.filter((r) => r.status === "submitted" || r.status === "approved").length;
  const overdue = rows.filter(
    (r) => r.status === "pending" && r.tasks && new Date(r.tasks.due_at) < new Date()
  ).length;
  const totalDocs =
    rows.reduce((n, r) => n + r.documents.filter((d) => d.is_current).length, 0) +
    (adhoc?.length ?? 0);

  return (
    <>
      <PageHeader eyebrow="Faculty folder" title={faculty.full_name}>
        <span className="font-mono text-[12px]">{faculty.email}</span>
        {faculty.designation && <span className="mx-2 text-rule">·</span>}
        {faculty.designation}
        {faculty.department && ` · ${faculty.department}`}
        {faculty.employee_code && (
          <span className="ml-2 font-mono text-[12px]">{faculty.employee_code}</span>
        )}
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Documents on file" value={totalDocs} />
        <Stat label="Tasks filed" value={`${filed}/${rows.length}`} tone="archive" />
        <Stat label="Overdue" value={overdue} tone={overdue ? "overdue" : "ink"} />
        <Stat
          label="First sign-in"
          value={<span className="text-sm">{faculty.first_login_at ? fmtDate(faculty.first_login_at) : "—"}</span>}
        />
      </div>

      <div className="mb-6">
        <Panel title="Consolidated report">
          <div className="px-4 py-4">
            <ReportButton facultyId={faculty.id} templates={templates} />
            <p className="mt-3 text-xs text-muted">
              Builds a cover section from the chosen template, then appends every current
              document as pages of the same PDF.
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Assigned tasks">
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing assigned yet"
            hint="Assign a task and it appears here the moment it's created."
          />
        ) : (
          <ul className="ledger">
            {rows.map((r) => {
              const isOverdue =
                r.status === "pending" && !!r.tasks && new Date(r.tasks.due_at) < new Date();
              const docs = r.documents.filter((d) => d.is_current);
              return (
                <li key={r.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{r.tasks?.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        Due {fmtDate(r.tasks?.due_at ?? null)}
                        {r.tasks && ` · ${dueLabel(r.tasks.due_at)}`}
                        {r.submitted_at && ` · filed ${fmtDateTime(r.submitted_at)}`}
                      </p>
                      {r.remarks && (
                        <p className="mt-1.5 text-xs text-reject">Sent back: {r.remarks}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Stamp status={r.status as never} overdue={isOverdue} />
                      <ReviewControls assignmentId={r.id} status={r.status} />
                    </div>
                  </div>

                  {docs.length > 0 && (
                    <ul className="mt-3 space-y-1 border-l-2 border-rule pl-3">
                      {docs.map((d) => (
                        <li key={d.id} className="flex flex-wrap items-center gap-3">
                          <DownloadLink
                            bucket={DOC_BUCKET}
                            path={d.storage_path}
                            className="text-[13px] text-archive underline-offset-2 hover:underline"
                          >
                            {d.title}
                          </DownloadLink>
                          <span className="tabular font-mono text-[10px] text-muted">
                            v{d.version} · {fmtSize(d.size_bytes)} · {fmtDate(d.uploaded_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {(adhoc?.length ?? 0) > 0 && (
        <div className="mt-6">
          <Panel title="Filed outside a task">
            <ul className="ledger">
              {(adhoc ?? []).map((d: { id: string; title: string; storage_path: string; size_bytes: number; uploaded_at: string }) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <DownloadLink
                    bucket={DOC_BUCKET} path={d.storage_path}
                    className="text-[13px] text-archive hover:underline"
                  >
                    {d.title}
                  </DownloadLink>
                  <span className="tabular ml-auto font-mono text-[10px] text-muted">
                    {fmtSize(d.size_bytes)} · {fmtDate(d.uploaded_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <div className="mt-8">
        <Link href="/admin/faculty" className="font-mono text-[11px] text-muted hover:text-ink">
          ← All faculty
        </Link>
      </div>
    </>
  );
}
