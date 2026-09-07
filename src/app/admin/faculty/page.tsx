import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import { FacultyForm } from "@/components/FacultyForm";
import { fmtDate } from "@/lib/format";
import type { Faculty } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FacultyList() {
  const supabase = createClient();
  const { data } = await supabase.from("faculty").select("*").order("full_name");
  const faculty = (data ?? []) as Faculty[];

  const { data: counts } = await supabase
    .from("documents").select("faculty_id").eq("is_current", true);
  const docCount = new Map<string, number>();
  (counts ?? []).forEach((d: { faculty_id: string }) =>
    docCount.set(d.faculty_id, (docCount.get(d.faculty_id) ?? 0) + 1));

  return (
    <>
      <PageHeader eyebrow="Faculty" title="Registered records">
        Each record is a folder. Register a faculty member here before assigning them
        anything — the folder exists from that moment, whether or not they&apos;ve signed in yet.
      </PageHeader>

      <div className="mb-6"><FacultyForm /></div>

      <Panel title={`${faculty.length} records`}>
        {faculty.length === 0 ? (
          <EmptyState
            title="No faculty registered"
            hint="Add the first record above. Only registered institute emails can sign in."
          />
        ) : (
          <ul className="ledger">
            {faculty.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/admin/faculty/${f.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-paper"
                >
                  <span className="min-w-[180px] text-[13px] font-medium">{f.full_name}</span>
                  <span className="font-mono text-[11px] text-muted">{f.email}</span>
                  <span className="ml-auto flex items-center gap-4 font-mono text-[11px] text-muted">
                    {f.employee_code && <span>{f.employee_code}</span>}
                    <span className="tabular">{docCount.get(f.id) ?? 0} docs</span>
                    <span
                      className={
                        f.first_login_at
                          ? "text-archive"
                          : "text-overdue"
                      }
                    >
                      {f.first_login_at ? `active ${fmtDate(f.first_login_at)}` : "never signed in"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
