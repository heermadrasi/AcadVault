"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Panel } from "@/components/ui";
import { TOKENS, STARTER_TEMPLATE } from "@/lib/templateTokens";
import type { ReportTemplate } from "@/lib/types";

export function TemplateEditor({ existing }: { existing: ReportTemplate[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", body_html: STARTER_TEMPLATE, page_size: "A4",
    append_files: true, is_default: existing.length === 0,
  });

  function load(t: ReportTemplate) {
    setEditing(t);
    setForm({
      name: t.name, body_html: t.body_html, page_size: t.page_size,
      append_files: t.append_files, is_default: t.is_default,
    });
  }

  function reset() {
    setEditing(null);
    setForm({
      name: "", body_html: STARTER_TEMPLATE, page_size: "A4",
      append_files: true, is_default: existing.length === 0,
    });
  }

  async function save() {
    setBusy(true); setError(null);
    const res = await fetch(
      editing ? `/api/templates/${editing.id}` : "/api/templates",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't save this template.");
    reset();
    router.refresh();
  }

  function insert(token: string) {
    setForm((f) => ({ ...f, body_html: f.body_html + "\n" + token }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        {existing.length > 0 && (
          <Panel title="Saved templates">
            <ul className="ledger">
              {existing.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[13px] font-medium">{t.name}</span>
                  {t.is_default && (
                    <span className="rounded-sm border border-archive/25 bg-archive-soft px-1.5 py-0.5 font-mono text-[10px] uppercase text-archive">
                      Default
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[10px] text-muted">
                    {t.page_size} · {t.append_files ? "files appended" : "summary only"}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => load(t)}>Edit</Button>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title={editing ? `Editing — ${editing.name}` : "New template"}>
          <div className="grid gap-4 px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Template name">
                <input className="field" placeholder="NAAC annual record"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Page size">
                <select className="field" value={form.page_size}
                  onChange={(e) => setForm({ ...form, page_size: e.target.value })}>
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </Field>
            </div>

            <Field label="Layout" hint="HTML plus the tokens on the right. Tokens are escaped on render, so a document title containing markup can't break the page.">
              <textarea
                className="field min-h-[420px] font-mono text-[12px] leading-relaxed"
                spellCheck={false}
                value={form.body_html}
                onChange={(e) => setForm({ ...form, body_html: e.target.value })}
              />
            </Field>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" className="h-3.5 w-3.5 accent-[#1F5F4E]"
                  checked={form.append_files}
                  onChange={(e) => setForm({ ...form, append_files: e.target.checked })} />
                Append the actual uploaded files after this cover
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" className="h-3.5 w-3.5 accent-[#1F5F4E]"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                Use as default
              </label>
            </div>

            {error && <p className="text-sm text-reject">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={save} disabled={busy || !form.name || !form.body_html}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create template"}
              </Button>
              {editing && <Button variant="ghost" onClick={reset}>Cancel</Button>}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Tokens">
        <ul className="ledger">
          {TOKENS.map((t) => (
            <li key={t.token} className="px-3 py-2.5">
              <button
                onClick={() => insert(t.token)}
                className="block w-full text-left font-mono text-[11px] text-archive hover:underline"
              >
                {t.token}
              </button>
              <p className="mt-0.5 text-[11px] text-muted">{t.desc}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
