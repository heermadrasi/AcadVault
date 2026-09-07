import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Faculty, Profile } from "@/lib/types";

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, avatar_url, role")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}

export async function requireFaculty(): Promise<{ profile: Profile; faculty: Faculty }> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/");
  if (profile.role === "admin") redirect("/admin");
  const supabase = createClient();
  const { data } = await supabase
    .from("faculty")
    .select("*")
    .eq("user_id", profile.user_id)
    .maybeSingle();
  if (!data) redirect("/not-registered");
  return { profile, faculty: data as Faculty };
}

/** For route handlers: returns null instead of redirecting. */
export async function apiProfile(): Promise<Profile | null> {
  return getSessionProfile();
}
