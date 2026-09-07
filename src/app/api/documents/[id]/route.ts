import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";
import { DOC_BUCKET } from "@/lib/types";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const profile = await apiProfile();
  if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const supabase = createClient();
  const { data: doc } = await supabase
    .from("documents").select("id, storage_path, assignment_id").eq("id", params.id).maybeSingle();

  if (!doc) return NextResponse.json({ error: "That document is gone." }, { status: 404 });

  // RLS decides whether this delete is allowed; we just act on the result.
  const { error } = await supabase.from("documents").delete().eq("id", params.id);
  if (error)
    return NextResponse.json({ error: "This document can't be withdrawn." }, { status: 403 });

  await supabase.storage.from(DOC_BUCKET).remove([doc.storage_path]);
  return NextResponse.json({ ok: true });
}
