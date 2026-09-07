import express from "express";
import { db, DOC_BUCKET, REPORT_BUCKET } from "./db.js";
import { renderTemplate, type ReportContext } from "./template.js";
import { htmlToPdf, shutdown } from "./render.js";
import { mergeReport, type Attachment } from "./merge.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/render", async (req, res) => {
  if (req.header("x-worker-secret") !== process.env.WORKER_SECRET) {
    return res.status(401).json({ error: "Bad worker secret." });
  }

  const runId = req.body?.run_id;
  if (!runId) return res.status(400).json({ error: "No run_id." });

  // Answer immediately; the app polls report_runs for the outcome.
  res.status(202).json({ accepted: true });
  build(runId).catch(async (err) => {
    console.error("[report]", runId, err);
    await db.from("report_runs").update({
      status: "failed",
      error_text: String(err?.message ?? err).slice(0, 400),
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
  });
});

async function build(runId: string) {
  await db.from("report_runs").update({ status: "running" }).eq("id", runId);

  const { data: run } = await db
    .from("report_runs")
    .select("id, faculty_id, template_id")
    .eq("id", runId)
    .single();
  if (!run) throw new Error("Run not found");

  const [{ data: faculty }, { data: template }] = await Promise.all([
    db.from("faculty").select("*").eq("id", run.faculty_id).single(),
    db.from("report_templates").select("*").eq("id", run.template_id).single(),
  ]);
  if (!faculty) throw new Error("Faculty not found");
  if (!template) throw new Error("Template not found");

  const { data: docs } = await db
    .from("documents")
    .select(`id, title, category, storage_path, mime_type, uploaded_at,
             task_assignments ( tasks ( title ) )`)
    .eq("faculty_id", run.faculty_id)
    .eq("is_current", true)
    .order("uploaded_at");

  type DocRow = {
    id: string; title: string; category: string | null; storage_path: string;
    mime_type: string; uploaded_at: string;
    task_assignments: { tasks: { title: string } | null } | null;
  };
  let rows = ((docs ?? []) as unknown as DocRow[]);

  if (template.category_filter?.length) {
    rows = rows.filter((d) => template.category_filter.includes(d.category ?? ""));
  }
  if (rows.length === 0) throw new Error("This faculty has no documents on file yet.");

  // ---- 1. Build the template context ----
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const byCategory = new Map<string, ReportContext["categories"][number]["documents"]>();
  for (const d of rows) {
    const key = d.category ?? "Uncategorised";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push({
      title: d.title,
      uploaded_on: fmt(d.uploaded_at),
      task_title: d.task_assignments?.tasks?.title ?? "—",
    });
  }

  const context: ReportContext = {
    faculty: {
      full_name: faculty.full_name,
      email: faculty.email,
      department: faculty.department ?? "—",
      designation: faculty.designation ?? "—",
      employee_code: faculty.employee_code ?? "—",
    },
    report: { generated_on: fmt(new Date().toISOString()), total_documents: rows.length },
    categories: [...byCategory.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, documents]) => ({ name, documents })),
  };

  // ---- 2. Template -> sanitised HTML -> cover PDF ----
  const html = renderTemplate(template.body_html, context);
  const cover = await htmlToPdf(html, {
    pageSize: template.page_size,
    margins: template.margins ?? {},
    footerHtml: template.footer_html,
  });

  // ---- 3. Pull the real files and merge ----
  let attachments: Attachment[] = [];
  if (template.append_files) {
    attachments = (
      await Promise.all(
        rows.map(async (d): Promise<Attachment | null> => {
          const { data, error } = await db.storage.from(DOC_BUCKET).download(d.storage_path);
          if (error || !data) return null;
          return {
            title: d.title,
            mime: d.mime_type,
            bytes: new Uint8Array(await data.arrayBuffer()),
          };
        })
      )
    ).filter((a): a is Attachment => a !== null);
  }

  const merged = await mergeReport(cover, attachments);

  // ---- 4. Store and mark done ----
  const path = `${run.faculty_id}/${run.id}.pdf`;
  const { error: upErr } = await db.storage
    .from(REPORT_BUCKET)
    .upload(path, merged, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  await db.from("report_runs").update({
    status: "done",
    storage_path: path,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);

  console.log(`[report] ${runId} done — ${rows.length} docs, ${attachments.length} attached`);
}

const port = Number(process.env.PORT ?? 8080);
const server = app.listen(port, () => console.log(`pdf-worker on :${port}`));

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, async () => {
    server.close();
    await shutdown();
    process.exit(0);
  });
}
