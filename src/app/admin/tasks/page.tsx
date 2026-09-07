import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, EmptyState, Button } from "@/components/ui";
import { fmtDate, dueLabel, daysUntil } from "@/lib/format";
import type { MatrixRow, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TaskList() {
  const supabase = createClient();
  const [{ data: taskRows }, { data: matrix }] = await Promise.all([
    supabase.from("tasks").select("*").order("due_at", { ascending: false }),
    supabase.from("task_status_matrix").select("task_id, status"),
  ]);

  const tasks = (taskRows ?? []) as Task[];
  const stats = new Map<string, { total: number; done: number }>();
  ((matrix ?? []) as Pick<MatrixRow, "task_id" | "status">[]).forEach((r) => {
    const s = stats.get(r.task_id) ?? { total: 0, done: 0 };
    s.total += 1;
    if (r.status === "submitted" || r.status === "approved") s.done += 1;
    stats.set(r.task_id, s);
  });

  return (
    <>
      <PageHeader
        eyebrow="Tasks" title="What the office has asked for"
        action={<Link href="/admin/tasks/new"><Button>Assign a task</Button></Link>}
      />
      <Panel title={`${tasks.length} tasks`}>
        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            hint="Create one and pick who owes it. The register builds itself from there."
            action={<Link href="/admin/tasks/new"><Button>Assign a task</Button></Link>}
          />
        ) : (
          <ul className="ledger">
            {tasks.map((t) => {
              const s = stats.get(t.id) ?? { total: 0, done: 0 };
              const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
              const late = daysUntil(t.due_at) < 0 && s.done < s.total;
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5">
                  <div className="min-w-[240px] flex-1">
                    <p className="text-[13px] font-medium">{t.title}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {t.category ? `${t.category} · ` : ""}due {fmtDate(t.due_at)}
                      <span className={late ? "text-overdue" : ""}> · {dueLabel(t.due_at)}</span>
                    </p>
                  </div>
                  <div className="flex w-[180px] items-center gap-2.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule">
                      <div
                        className={`h-full rounded-full ${late ? "bg-overdue" : "bg-archive"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="tabular font-mono text-[11px] text-muted">
                      {s.done}/{s.total}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
