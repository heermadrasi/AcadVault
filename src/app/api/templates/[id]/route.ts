import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const profile = await apiProfile();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json();
  const supabase = createClient();

  if (body.is_default)
    await supabase.from("report_templates")
      .update({ is_default: false }).eq("is_default", true).neq("id", params.id);

  const { data, error } = await supabase
    .from("report_templates")
    .update({
      name: body.name?.trim(),
      body_html: body.body_html,
      page_size: body.page_size,
      append_files: !!body.append_files,
      is_default: !!body.is_default,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: "The template couldn't be updated." }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const profile = await apiProfile();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const supabase = createClient();
  const { error } = await supabase.from("report_templates").delete().eq("id", params.id);
  if (error)
    return NextResponse.json(
      { error: "This template is used by past reports and can't be removed." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
