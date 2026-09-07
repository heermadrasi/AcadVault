import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Two jobs:
 *  1. Refresh the Supabase session cookie (Server Components can't set cookies).
 *  2. Coarse route guard. Fine-grained authorisation is RLS in Postgres —
 *     this only saves a wasted render.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: CookieToSet[]) => {
          list.forEach(({ name, value }: CookieToSet) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }: CookieToSet) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/admin") || path.startsWith("/dashboard");

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("user_id", user.id).maybeSingle();

    if (!profile) return NextResponse.redirect(new URL("/not-registered", request.url));
    if (path.startsWith("/admin") && profile.role !== "admin")
      return NextResponse.redirect(new URL("/dashboard", request.url));
    if (path.startsWith("/dashboard") && profile.role === "admin")
      return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (user && path === "/") {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("user_id", user.id).maybeSingle();
    if (profile)
      return NextResponse.redirect(
        new URL(profile.role === "admin" ? "/admin" : "/dashboard", request.url)
      );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
