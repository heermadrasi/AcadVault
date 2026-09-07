import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";

/** Poll a run's status. */
export async function GET(request: NextRequest) {
  const profile = await apiProfile();
  if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const runId = request.nextUrl.searchParams.get("run");
  if (!runId) return NextResponse.json({ error: "No run specified." }, { status: 400 });

  const supabase = createClient();
  const { data } = await supabase.from("report_runs").select("*").eq("id", runId).maybeSingle();
  if (!data) return NextResponse.json({ error: "Unknown report." }, { status: 404 });
  return NextResponse.json({ run: data });
}

/**
 * Queue a report. We insert the row first so the UI has something to poll even
 * if the worker is briefly down, then hand it off. Building a 30-document PDF
 * takes far longer than a serverless function is allowed to run.
 */
export async function POST(request: Request) {
  const profile = await apiProfile();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { faculty_id, template_id } = await request.json();
  if (!faculty_id || !template_id)
    return NextResponse.json({ error: "Pick a faculty and a template." }, { status: 400 });

  const supabase = createClient();
  const { data: run, error } = await supabase
    .from("report_runs")
    .insert({ faculty_id, template_id, requested_by: profile.user_id, status: "queued" })
    .select()
    .single();

  if (error || !run)
    return NextResponse.json({ error: "The report couldn't be queued." }, { status: 500 });

  const workerUrl = process.env.PDF_WORKER_URL;
  const secret = process.env.PDF_WORKER_SECRET;

  if (!workerUrl || !secret) {
    await supabase.from("report_runs")
      .update({ status: "failed", error_text: "PDF worker is not configured." })
      .eq("id", run.id);
    return NextResponse.json({ error: "PDF worker is not configured." }, { status: 503 });
  }

  // Fire and forget — the worker owns the job from here.
  fetch(`${workerUrl}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-worker-secret": secret },
    body: JSON.stringify({ run_id: run.id }),
  }).catch(async () => {
    await supabase.from("report_runs")
      .update({ status: "failed", error_text: "The PDF worker didn't respond." })
      .eq("id", run.id);
  });

  return NextResponse.json({ run }, { status: 202 });
}
