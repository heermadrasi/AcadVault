"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Panel } from "@/components/ui";
import type { Faculty } from "@/lib/types";

export function TaskForm({ faculty }: { faculty: Faculty[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", category: "", due_at: "",
    allow_multiple: false, max_size_mb: 10,
    accepted_mime: "application/pdf,image/jpeg,image/png",
  });

  const depts = Array.from(new Set(faculty.map((f) => f.department).filter(Boolean))) as string[];

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    setBusy(true); setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        due_at: new Date(form.due_at).toISOString(),
        max_size_mb: Number(form.max_size_mb),
        accepted_mime: form.accepted_mime.split(",").map((s) => s.trim()).filter(Boolean),
        faculty_ids: selected,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't create this task.");
    router.push("/admin/tasks");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Panel title="Task">
        <div className="grid gap-4 px-4 py-4">
          <Field label="Title">
            <input className="field" placeholder="NPTEL completion certificate — Odd sem"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="What exactly is needed" hint="Faculty see this on their task page.">
            <textarea className="field min-h-[90px]" rows={3}
              placeholder="Upload the signed completion certificate as a single PDF."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" hint="Groups documents in the generated report.">
              <input className="field" placeholder="Certifications"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Deadline">
              <input type="datetime-local" className="field"
                value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
            </Field>
            <Field label="Accepted file types">
              <input className="field font-mono text-[12px]"
                value={form.accepted_mime} onChange={(e) => setForm({ ...form, accepted_mime: e.target.value })} />
            </Field>
            <Field label="Max size (MB)">
              <input type="number" min={1} max={50} className="field tabular"
                value={form.max_size_mb} onChange={(e) => setForm({ ...form, max_size_mb: Number(e.target.value) })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="h-3.5 w-3.5 accent-[#1F5F4E]"
              checked={form.allow_multiple}
              onChange={(e) => setForm({ ...form, allow_multiple: e.target.checked })} />
            Allow more than one file per faculty
          </label>
          {error && <p className="text-sm text-reject">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={busy || !form.title || !form.due_at || !selected.length}>
              {busy ? "Creating…" : `Assign to ${selected.length || "…"} faculty`}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title={`Assign to · ${selected.length} selected`}
        action={
          <button
            onClick={() => setSelected(selected.length === faculty.length ? [] : faculty.map((f) => f.id))}
            className="font-mono text-[11px] text-archive hover:underline"
          >
            {selected.length === faculty.length ? "Clear" : "Select all"}
          </button>
        }
      >
        {depts.length > 1 && (
          <div className="flex flex-wrap gap-1.5 border-b border-rule px-4 py-2.5">
            {depts.map((d) => (
              <button
                key={d}
                onClick={() =>
                  setSelected(Array.from(new Set(selected.concat(faculty.filter((f) => f.department === d).map((f) => f.id)))))
                }
                className="rounded-sm border border-rule px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted hover:border-archive hover:text-archive"
              >
                + {d}
              </button>
            ))}
          </div>
        )}
        <ul className="ledger max-h-[420px] overflow-y-auto">
          {faculty.map((f) => (
            <li key={f.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-paper">
                <input type="checkbox" className="h-3.5 w-3.5 accent-[#1F5F4E]"
                  checked={selected.includes(f.id)} onChange={() => toggle(f.id)} />
                <span className="text-[13px]">{f.full_name}</span>
                {f.department && (
                  <span className="ml-auto font-mono text-[10px] text-muted">{f.department}</span>
                )}
              </label>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
