import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import { TaskForm } from "@/components/TaskForm";
import type { Faculty } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewTask() {
  const supabase = createClient();
  const { data } = await supabase
    .from("faculty").select("*").eq("is_active", true).order("full_name");
  const faculty = (data ?? []) as Faculty[];

  return (
    <>
      <PageHeader eyebrow="Tasks" title="Assign a document task">
        Every faculty you tick gets their own row in the register and a task on their dashboard.
      </PageHeader>
      {faculty.length === 0 ? (
        <Panel>
          <EmptyState
            title="No faculty to assign to"
            hint="Register at least one faculty record before creating a task."
          />
        </Panel>
      ) : (
        <TaskForm faculty={faculty} />
      )}
    </>
  );
}
