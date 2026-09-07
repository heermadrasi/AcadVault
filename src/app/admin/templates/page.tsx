import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { TemplateEditor } from "@/components/TemplateEditor";
import type { ReportTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Templates() {
  const supabase = createClient();
  const { data } = await supabase
    .from("report_templates").select("*").order("is_default", { ascending: false });

  return (
    <>
      <PageHeader eyebrow="Report templates" title="How the generated PDF should read">
        The layout below becomes the cover section of every report. Uploaded documents
        are appended after it as real pages, not screenshots.
      </PageHeader>
      <TemplateEditor existing={(data ?? []) as ReportTemplate[]} />
    </>
  );
}
