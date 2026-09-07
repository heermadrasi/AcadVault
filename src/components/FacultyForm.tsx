"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/components/ui";

export function FacultyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "", email: "", department: "", designation: "", employee_code: "",
  });

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function save() {
    setBusy(true); setError(null);
    const res = await fetch("/api/faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't save this record.");
    setForm({ full_name: "", email: "", department: "", designation: "", employee_code: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Register faculty</Button>;

  return (
    <div className="rounded-md border border-rule bg-card p-5 shadow-card">
      <p className="eyebrow mb-4">New faculty record</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className="field" value={form.full_name} onChange={set("full_name")} placeholder="Dr. Ananya Rao" />
        </Field>
        <Field label="Institute email" hint="Must match the Google account they'll sign in with.">
          <input className="field font-mono text-[13px]" value={form.email} onChange={set("email")} placeholder="ananya.rao@jaipur.manipal.edu" />
        </Field>
        <Field label="Department">
          <input className="field" value={form.department} onChange={set("department")} placeholder="CCE" />
        </Field>
        <Field label="Designation">
          <input className="field" value={form.designation} onChange={set("designation")} placeholder="Assistant Professor" />
        </Field>
        <Field label="Employee code">
          <input className="field font-mono text-[13px]" value={form.employee_code} onChange={set("employee_code")} placeholder="MUJ-CCE-114" />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-reject">{error}</p>}
      <div className="mt-5 flex gap-2">
        <Button onClick={save} disabled={busy || !form.full_name || !form.email}>
          {busy ? "Saving…" : "Save record"}
        </Button>
        <Button variant="ghost" onClick={() => { setOpen(false); setError(null); }}>Cancel</Button>
      </div>
    </div>
  );
}
