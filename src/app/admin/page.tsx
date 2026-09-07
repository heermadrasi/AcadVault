import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Stat, Panel, EmptyState, Button, Stamp } from "@/components/ui";
import { StatusMatrix } from "@/components/StatusMatrix";
import { fmtDate, dueLabel } from "@/lib/format";
import type { MatrixRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = createClient();

  const [{ data: matrix }, { count: facultyCount }] = await Promise.all([
    supabase.from("task_status_matrix").select("*").order("due_at"),
    supabase.from("faculty").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const rows = (matrix ?? []) as MatrixRow[];
  const outstanding = rows.filter((r) => r.status === "pending" || r.status === "rejected");
  const overdue = rows.filter((r) => r.is_overdue);
  const awaitingReview = rows.filter((r) => r.status === "submitted");

  const chase = [...overdue]
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Submission register"
        title="Where the department stands"
        action={
          <Link href="/admin/tasks/new">
            <Button>Assign a task</Button>
          </Link>
        }
      >
        Each square is one document a faculty member owes the office.
      </PageHeader>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active faculty" value={facultyCount ?? 0} />
        <Stat label="Outstanding" value={outstanding.length} />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "overdue" : "ink"} />
        <Stat label="Awaiting review" value={awaitingReview.length} tone="archive" />
      </div>

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            title="No tasks assigned yet"
            hint="Register your faculty first, then create a task and assign it. The register fills in as they submit."
            action={
              <Link href="/admin/faculty"><Button>Register faculty</Button></Link>
            }
          />
        </Panel>
      ) : (
        <>
          <StatusMatrix rows={rows} />

          {chase.length > 0 && (
            <div className="mt-8">
              <Panel title="Chase list — oldest overdue first">
                <ul className="ledger">
                  {chase.map((r) => (
                    <li key={r.assignment_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Link
                        href={`/admin/faculty/${r.faculty_id}`}
                        className="min-w-[160px] text-[13px] font-medium hover:text-archive"
                      >
                        {r.full_name}
                      </Link>
                      <span className="flex-1 text-[13px] text-muted">{r.task_title}</span>
                      <span className="tabular font-mono text-[11px] text-overdue">
                        {dueLabel(r.due_at)} · {fmtDate(r.due_at)}
                      </span>
                      <Stamp status={r.status} overdue={r.is_overdue} />
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </>
      )}
    </>
  );
}
