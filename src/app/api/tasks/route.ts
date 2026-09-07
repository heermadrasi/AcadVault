import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";

export async function POST(request: Request) {
  const profile = await apiProfile();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json();
  const facultyIds: string[] = Array.isArray(body.faculty_ids) ? body.faculty_ids : [];

  if (!body.title?.trim())
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  if (!body.due_at || Number.isNaN(Date.parse(body.due_at)))
    return NextResponse.json({ error: "A valid deadline is required." }, { status: 400 });
  if (!facultyIds.length)
    return NextResponse.json({ error: "Pick at least one faculty member." }, { status: 400 });

  const supabase = createClient();

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .insert({
      title: body.title.trim(),
      description: body.description || null,
      category: body.category || null,
      due_at: body.due_at,
      allow_multiple: !!body.allow_multiple,
      accepted_mime: body.accepted_mime?.length ? body.accepted_mime : ["application/pdf"],
      max_size_mb: Math.min(Math.max(Number(body.max_size_mb) || 10, 1), 50),
      created_by: profile.user_id,
    })
    .select()
    .single();

  if (taskErr || !task)
    return NextResponse.json({ error: "The task couldn't be created." }, { status: 500 });

  const { error: assignErr } = await supabase
    .from("task_assignments")
    .insert(facultyIds.map((faculty_id) => ({ task_id: task.id, faculty_id })));

  if (assignErr) {
    // Don't leave a task nobody owes anything against.
    await supabase.from("tasks").delete().eq("id", task.id);
    return NextResponse.json({ error: "The task couldn't be assigned." }, { status: 500 });
  }

  return NextResponse.json({ task, assigned: facultyIds.length }, { status: 201 });
}
