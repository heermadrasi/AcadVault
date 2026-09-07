import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(`${origin}/?error=missing_code`);

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The handle_new_user() trigger raises ACADVAULT_NOT_PROVISIONED for any
    // Google account that isn't in `faculty` or `admin_allowlist`. Supabase
    // surfaces that as a failed exchange, so we translate it here.
    const blocked = /ACADVAULT_NOT_PROVISIONED|Database error saving new user/i.test(
      `${error.message} ${(error as { code?: string }).code ?? ""}`
    );
    return NextResponse.redirect(`${origin}${blocked ? "/not-registered" : "/?error=auth"}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/?error=auth`);

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).maybeSingle();

  if (!profile) return NextResponse.redirect(`${origin}/not-registered`);
  return NextResponse.redirect(`${origin}${profile.role === "admin" ? "/admin" : "/dashboard"}`);
}
