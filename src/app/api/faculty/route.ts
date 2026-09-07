import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiProfile } from "@/lib/auth";

export async function POST(request: Request) {
  const profile = await apiProfile();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const full_name = String(body.full_name ?? "").trim();

  if (!full_name) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "That doesn't look like a valid email." }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("faculty")
    .insert({
      email, full_name,
      department: body.department || null,
      designation: body.designation || null,
      employee_code: body.employee_code || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "That email or employee code is already registered." }, { status: 409 });
    return NextResponse.json({ error: "The record couldn't be saved." }, { status: 500 });
  }

  return NextResponse.json({ faculty: data }, { status: 201 });
}
