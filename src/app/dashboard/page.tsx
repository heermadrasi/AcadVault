import Link from "next/link";
import { requireFaculty } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, Stamp, EmptyState, Stat } from "@/components/ui";
import { fmtDate, dueLabel, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  id: string; status: string; remarks: string | null;
  tasks: { id: string; title: string; category: string | null; due_at: string } | null;
  documents: { id: string; is_current: boolean }[];
};

export default async function FacultyHome() {
  const { faculty } = await requireFaculty();
  const supabase = createClient();

  const { data } = await supabase
    .from("task_assignments")
    .select(`id, status, remarks, tasks ( id, title, category, due_at ), documents ( id, is_current )`)
    .eq("faculty_id", faculty.id);

  const rows = ((data ?? []) as unknown as Row[]).sort(
    (a, b) => (a.tasks?.due_at ?? "").localeCompare(b.tasks?.due_at ?? "")
  );

  const open = rows.filter((r) => r.status === "pending" || r.status === "rejected");
  const overdue = open.filter((r) => r.tasks && daysUntil(r.tasks.due_at) < 0);
  const done = rows.filter((r) => r.status === "approved").length;

  return (
    <>
      <PageHeader eyebrow="My record" title={`Hello, ${faculty.full_name.split(" ").slice(-1)[0]}`}>
        Everything the department office is waiting on from you, oldest deadline first.
      </PageHeader>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Still to file" value={open.length} />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "overdue" : "ink"} />
        <Stat label="Approved" value={done} tone="archive" />
      </div>

      <Panel title="Assigned to me">
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing to file right now"
            hint="When the office assigns you a document, it shows up here with its deadline."
          />
        ) : (
          <ul className="ledger">
            {rows.map((r) => {
              const late = r.status === "pending" && !!r.tasks && daysUntil(r.tasks.due_at) < 0;
              const files = r.documents.filter((d) => d.is_current).length;
              return (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/tasks/${r.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 hover:bg-paper"
                  >
                    <div className="min-w-[220px] flex-1">
                      <p className="text-[13px] font-medium">{r.tasks?.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        Due {fmtDate(r.tasks?.due_at ?? null)}
                        {r.tasks && (
                          <span className={late ? "text-overdue" : ""}> · {dueLabel(r.tasks.due_at)}</span>
                        )}
                        {files > 0 && ` · ${files} file${files > 1 ? "s" : ""} on record`}
                      </p>
                      {r.remarks && (
                        <p className="mt-1.5 text-xs text-reject">Sent back: {r.remarks}</p>
                      )}
                    </div>
                    <Stamp status={r.status as never} overdue={late} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
