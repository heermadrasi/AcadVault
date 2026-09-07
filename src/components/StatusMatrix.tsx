"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { MatrixRow } from "@/lib/types";
import { stampCellClass, cn } from "@/components/ui";
import { fmtDate } from "@/lib/format";

/**
 * The signature screen. Rows = faculty, columns = tasks, one cell per
 * assignment. Deliberately dense: the whole department fits above the fold,
 * which is the only way an office actually spots who to chase.
 */
export function StatusMatrix({ rows }: { rows: MatrixRow[] }) {
  const [query, setQuery] = useState("");
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);

  const { tasks, faculty, cell } = useMemo(() => {
    const taskMap = new Map<string, { id: string; title: string; due_at: string }>();
    const facMap = new Map<string, { id: string; name: string; dept: string | null }>();
    const cell = new Map<string, MatrixRow>();
    for (const r of rows) {
      taskMap.set(r.task_id, { id: r.task_id, title: r.task_title, due_at: r.due_at });
      facMap.set(r.faculty_id, { id: r.faculty_id, name: r.full_name, dept: r.department });
      cell.set(`${r.faculty_id}|${r.task_id}`, r);
    }
    return {
      tasks: Array.from(taskMap.values()).sort((a, b) => a.due_at.localeCompare(b.due_at)),
      faculty: Array.from(facMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      cell,
    };
  }, [rows]);

  const visible = faculty.filter((f) => {
    if (query && !f.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (onlyOutstanding) {
      return tasks.some((t) => {
        const c = cell.get(`${f.id}|${t.id}`);
        return c && (c.status === "pending" || c.status === "rejected");
      });
    }
    return true;
  });

  if (!tasks.length) return null;

  return (
    <div className="rounded-md border border-rule bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-rule px-4 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name"
          className="field h-8 max-w-[220px] py-1"
          aria-label="Filter faculty by name"
        />
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={onlyOutstanding}
            onChange={(e) => setOnlyOutstanding(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#1F5F4E]"
          />
          Only faculty with something outstanding
        </label>
        <span className="tabular ml-auto font-mono text-[11px] text-muted">
          {visible.length}/{faculty.length} faculty · {tasks.length} tasks
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[200px] border-b border-r border-rule bg-card px-4 py-3 text-left">
                <span className="eyebrow">Faculty</span>
              </th>
              {tasks.map((t) => (
                <th key={t.id} className="border-b border-rule px-1 py-3 align-bottom">
                  <div className="mx-auto w-[26px]">
                    <span
                      className="block whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.06em] text-muted"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      title={`${t.title} — due ${fmtDate(t.due_at)}`}
                    >
                      {t.title.length > 26 ? t.title.slice(0, 25) + "…" : t.title}
                    </span>
                  </div>
                </th>
              ))}
              <th className="border-b border-l border-rule px-3 py-3 text-right">
                <span className="eyebrow">Done</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => {
              const done = tasks.filter((t) => {
                const c = cell.get(`${f.id}|${t.id}`);
                return c && (c.status === "submitted" || c.status === "approved");
              }).length;
              const assigned = tasks.filter((t) => cell.has(`${f.id}|${t.id}`)).length;
              return (
                <tr key={f.id} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-rule bg-card px-4 py-2 group-hover:bg-paper">
                    <Link href={`/admin/faculty/${f.id}`} className="block hover:text-archive">
                      <span className="text-[13px] font-medium">{f.name}</span>
                      {f.dept && (
                        <span className="ml-2 font-mono text-[10px] text-muted">{f.dept}</span>
                      )}
                    </Link>
                  </td>
                  {tasks.map((t) => {
                    const c = cell.get(`${f.id}|${t.id}`);
                    return (
                      <td key={t.id} className="border-b border-rule px-1 py-2 group-hover:bg-paper">
                        {c ? (
                          <Link
                            href={`/admin/faculty/${f.id}`}
                            title={`${t.title} — ${c.status}${c.is_overdue ? " (overdue)" : ""}`}
                            className="mx-auto block"
                          >
                            <span
                              className={cn(
                                "mx-auto block h-[22px] w-[22px] rounded-[2px] transition-transform hover:scale-110",
                                stampCellClass(c.status, c.is_overdue)
                              )}
                            />
                          </Link>
                        ) : (
                          <span className="mx-auto block h-[22px] w-[22px] rounded-[2px] border border-dashed border-rule" />
                        )}
                      </td>
                    );
                  })}
                  <td className="tabular border-b border-l border-rule px-3 py-2 text-right font-mono text-[12px] text-muted group-hover:bg-paper">
                    {done}/{assigned}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-rule px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
        {[["bg-archive", "Approved"], ["bg-archive/40", "Submitted"],
          ["bg-overdue/70", "Overdue"], ["bg-reject/60", "Sent back"],
          ["bg-rule", "Awaiting"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />{l}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] border border-dashed border-rule" />Not assigned
        </span>
      </div>
    </div>
  );
}
