import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const profile = await apiProfile();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { status, remarks } = await request.json();
  if (!["approved", "rejected", "pending"].includes(status))
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_assignments")
    .update({
      status,
      remarks: status === "rejected" ? remarks ?? null : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.user_id,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: "The review couldn't be saved." }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_id: profile.user_id,
    action: `assignment.${status}`,
    entity: "task_assignments",
    entity_id: params.id,
    meta: { remarks: remarks ?? null },
  });

  return NextResponse.json({ assignment: data });
}
