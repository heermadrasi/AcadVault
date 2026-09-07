"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import type { ReportRun, ReportTemplate } from "@/lib/types";

/**
 * Report generation is a queued job, not a request/response. A report merging
 * 30 certificates takes 20-60s — well past a serverless function timeout — so
 * we insert a run row, hand it to the worker, and poll the row for status.
 */
export function ReportButton({
  facultyId, templates,
}: { facultyId: string; templates: ReportTemplate[] }) {
  const [templateId, setTemplateId] = useState(
    templates.find((t) => t.is_default)?.id ?? templates[0]?.id ?? ""
  );
  const [run, setRun] = useState<ReportRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!run || run.status === "done" || run.status === "failed") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/reports?run=${run.id}`);
      if (res.ok) setRun((await res.json()).run);
    }, 2000);
    return () => clearInterval(t);
  }, [run]);

  async function generate() {
    setBusy(true); setError(null); setRun(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faculty_id: facultyId, template_id: templateId }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "The report couldn't be queued.");
    setRun(json.run);
  }

  async function download() {
    if (!run?.storage_path) return;
    const res = await fetch(
      `/api/download?bucket=reports&path=${encodeURIComponent(run.storage_path)}`
    );
    const json = await res.json();
    if (json.url) window.open(json.url, "_blank", "noopener");
  }

  if (!templates.length) {
    return (
      <p className="text-sm text-muted">
        No report template yet. Create one under Report templates first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className="field h-9 w-auto py-0 text-[13px]"
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        aria-label="Report template"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}{t.is_default ? " (default)" : ""}</option>
        ))}
      </select>

      {run && (run.status === "queued" || run.status === "running") ? (
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          {run.status === "queued" ? "Queued…" : "Building PDF…"}
        </span>
      ) : run?.status === "done" ? (
        <Button onClick={download}>Download report</Button>
      ) : (
        <Button onClick={generate} disabled={busy}>
          {busy ? "Queueing…" : "Generate report"}
        </Button>
      )}

      {run?.status === "failed" && (
        <span className="text-sm text-reject">
          {run.error_text ?? "The report failed to build."}
        </span>
      )}
      {error && <span className="text-sm text-reject">{error}</span>}
    </div>
  );
}
