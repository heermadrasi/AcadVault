import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";

/**
 * Records a file that the browser has already put in Storage.
 * The storage path is rebuilt from server-side facts, never trusted from the
 * client — otherwise a faculty could claim a path inside someone else's folder.
 */
export async function POST(request: Request) {
  const profile = await apiProfile();
  if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json();
  const supabase = createClient();

  const { data: faculty } = await supabase
    .from("faculty").select("id").eq("user_id", profile.user_id).maybeSingle();
  if (!faculty)
    return NextResponse.json({ error: "No faculty record for this account." }, { status: 403 });

  const { data: assignment } = await supabase
    .from("task_assignments")
    .select("id, status, faculty_id, tasks ( category, allow_multiple, max_size_mb )")
    .eq("id", body.assignment_id)
    .maybeSingle();

  if (!assignment || assignment.faculty_id !== faculty.id)
    return NextResponse.json({ error: "That task isn't assigned to you." }, { status: 403 });
  if (assignment.status === "approved")
    return NextResponse.json({ error: "This submission is approved and locked." }, { status: 409 });

  const task = (assignment as unknown as {
    tasks: { category: string | null; allow_multiple: boolean; max_size_mb: number } | null;
  }).tasks;

  const expectedPrefix = `${faculty.id}/${assignment.id}/`;
  if (!String(body.storage_path).startsWith(expectedPrefix))
    return NextResponse.json({ error: "That file path isn't yours." }, { status: 403 });

  // Single-file tasks: supersede the previous version rather than deleting it.
  let version = 1;
  if (!task?.allow_multiple) {
    const { data: prev } = await supabase
      .from("documents")
      .select("id, version")
      .eq("assignment_id", assignment.id)
      .eq("is_current", true)
      .maybeSingle();
    if (prev) {
      version = prev.version + 1;
      await supabase.from("documents").update({ is_current: false }).eq("id", prev.id);
    }
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      id: body.id,
      faculty_id: faculty.id,
      assignment_id: assignment.id,
      category: task?.category ?? null,
      title: String(body.title).slice(0, 200),
      storage_path: body.storage_path,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
      version,
      uploaded_by: profile.user_id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: "The file couldn't be recorded." }, { status: 500 });

  // A resubmission after a send-back returns the assignment to submitted.
  if (assignment.status === "rejected")
    await supabase
      .from("task_assignments")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), remarks: null })
      .eq("id", assignment.id);

  return NextResponse.json({ document: data }, { status: 201 });
}
