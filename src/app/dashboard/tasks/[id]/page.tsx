import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFaculty } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, Stamp } from "@/components/ui";
import { UploadCard } from "@/components/UploadCard";
import { DownloadLink } from "@/components/DownloadLink";
import { fmtDate, fmtDateTime, fmtSize, dueLabel, daysUntil } from "@/lib/format";
import { DOC_BUCKET } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string; status: string; remarks: string | null; submitted_at: string | null;
  tasks: {
    id: string; title: string; description: string | null; category: string | null;
    due_at: string; accepted_mime: string[]; max_size_mb: number; allow_multiple: boolean;
  } | null;
  documents: {
    id: string; title: string; storage_path: string; size_bytes: number;
    uploaded_at: string; version: number; is_current: boolean;
  }[];
};

export default async function TaskDetail({ params }: { params: { id: string } }) {
  const { faculty } = await requireFaculty();
  const supabase = createClient();

  const { data } = await supabase
    .from("task_assignments")
    .select(`id, status, remarks, submitted_at,
             tasks ( id, title, description, category, due_at, accepted_mime, max_size_mb, allow_multiple ),
             documents ( id, title, storage_path, size_bytes, uploaded_at, version, is_current )`)
    .eq("id", params.id)
    .maybeSingle();

  // RLS already limits this to the caller's own assignments — a miss is a 404.
  if (!data) notFound();
  const row = data as unknown as Row;
  const task = row.tasks;
  if (!task) notFound();

  const current = row.documents.filter((d) => d.is_current);
  const late = row.status === "pending" && daysUntil(task.due_at) < 0;
  const locked = row.status === "approved";

  return (
    <>
      <PageHeader eyebrow={task.category ?? "Assigned task"} title={task.title}>
        {task.description}
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Stamp status={row.status as never} overdue={late} />
        <span className={`font-mono text-[11px] ${late ? "text-overdue" : "text-muted"}`}>
          Due {fmtDate(task.due_at)} · {dueLabel(task.due_at)}
        </span>
        {row.submitted_at && (
          <span className="font-mono text-[11px] text-muted">
            Filed {fmtDateTime(row.submitted_at)}
          </span>
        )}
      </div>

      {row.remarks && (
        <div className="mb-6 rounded border border-reject/25 bg-reject-soft px-4 py-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-reject">
            Sent back by the office
          </p>
          <p className="mt-1 text-sm">{row.remarks}</p>
        </div>
      )}

      {current.length > 0 && (
        <div className="mb-6">
          <Panel title="On record">
            <ul className="ledger">
              {current.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <DownloadLink
                    bucket={DOC_BUCKET} path={d.storage_path}
                    className="text-[13px] text-archive hover:underline"
                  >
                    {d.title}
                  </DownloadLink>
                  <span className="tabular ml-auto font-mono text-[10px] text-muted">
                    v{d.version} · {fmtSize(d.size_bytes)} · {fmtDate(d.uploaded_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <Panel title={locked ? "Approved — locked" : "Upload"}>
        <div className="px-4 py-4">
          {locked ? (
            <p className="text-sm text-muted">
              The office has approved this submission, so it can no longer be changed.
              Contact them if something needs correcting.
            </p>
          ) : (
            <UploadCard
              facultyId={faculty.id}
              assignmentId={row.id}
              acceptedMime={task.accepted_mime}
              maxSizeMb={task.max_size_mb}
              allowMultiple={task.allow_multiple}
              hasFile={current.length > 0}
            />
          )}
        </div>
      </Panel>

      <div className="mt-8">
        <Link href="/dashboard" className="font-mono text-[11px] text-muted hover:text-ink">
          ← All my tasks
        </Link>
      </div>
    </>
  );
}
