import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";

const PAGE_SIZES = ["A4", "Letter", "Legal"];

export async function POST(request: Request) {
  const profile = await apiProfile();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json();
  if (!body.name?.trim() || !body.body_html?.trim())
    return NextResponse.json({ error: "A name and a layout are required." }, { status: 400 });
  if (!PAGE_SIZES.includes(body.page_size))
    return NextResponse.json({ error: "Unsupported page size." }, { status: 400 });

  const supabase = createClient();
  if (body.is_default) await supabase.from("report_templates").update({ is_default: false }).eq("is_default", true);

  const { data, error } = await supabase
    .from("report_templates")
    .insert({
      name: body.name.trim(),
      body_html: body.body_html,
      page_size: body.page_size,
      append_files: !!body.append_files,
      is_default: !!body.is_default,
      created_by: profile.user_id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: "The template couldn't be saved." }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
