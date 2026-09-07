import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";
import { DOC_BUCKET, REPORT_BUCKET } from "@/lib/types";

/**
 * Buckets are private. This mints a 60-second signed URL using the caller's
 * own session, so storage RLS is what decides whether the URL is issued.
 */
export async function GET(request: NextRequest) {
  const profile = await apiProfile();
  if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const bucket = request.nextUrl.searchParams.get("bucket");
  const path = request.nextUrl.searchParams.get("path");

  if (!path || (bucket !== DOC_BUCKET && bucket !== REPORT_BUCKET))
    return NextResponse.json({ error: "Unknown file." }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);

  if (error || !data)
    return NextResponse.json({ error: "You can't open this file." }, { status: 403 });

  return NextResponse.json({ url: data.signedUrl });
}
