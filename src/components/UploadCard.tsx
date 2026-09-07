"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { DOC_BUCKET } from "@/lib/types";

/**
 * Two-step upload: file goes straight to Storage from the browser (storage RLS
 * checks the folder is the caller's own faculty id), then the row is inserted.
 * If step 2 fails we delete the blob so we don't leave an orphan.
 */
export function UploadCard({
  facultyId, assignmentId, acceptedMime, maxSizeMb, allowMultiple, hasFile,
}: {
  facultyId: string; assignmentId: string; acceptedMime: string[];
  maxSizeMb: number; allowMultiple: boolean; hasFile: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    setError(null);

    if (!acceptedMime.includes(file.type)) {
      return setError(`This task accepts ${acceptedMime.join(", ")}. That file is ${file.type || "an unknown type"}.`);
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      return setError(`That file is over the ${maxSizeMb} MB limit for this task.`);
    }

    setBusy(true);
    const supabase = createClient();
    const documentId = crypto.randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${facultyId}/${assignmentId}/${documentId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(DOC_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (upErr) {
      setBusy(false);
      return setError("The file didn't reach storage. Check your connection and try again.");
    }

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: documentId, assignment_id: assignmentId, storage_path: path,
        title: file.name, mime_type: file.type, size_bytes: file.size,
      }),
    });

    if (!res.ok) {
      await supabase.storage.from(DOC_BUCKET).remove([path]);
      setBusy(false);
      const json = await res.json().catch(() => ({}));
      return setError(json.error ?? "The file uploaded but couldn't be recorded. Try again.");
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  if (hasFile && !allowMultiple) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">One file is on record for this task.</p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : "Replace it"}
        </Button>
        <input ref={inputRef} type="file" className="hidden"
          accept={acceptedMime.join(",")}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {error && <p className="w-full text-sm text-reject">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`cursor-pointer rounded border border-dashed px-5 py-7 text-center transition-colors ${
          drag ? "border-archive bg-archive-soft" : "border-rule bg-paper hover:border-archive/50"
        }`}
      >
        <p className="text-sm font-medium">
          {busy ? "Uploading…" : "Drop the file here, or click to choose"}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted">
          {acceptedMime.map((m) => m.split("/")[1]?.toUpperCase()).join(" · ")} · up to {maxSizeMb} MB
        </p>
      </div>
      <input ref={inputRef} type="file" className="hidden"
        accept={acceptedMime.join(",")}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {error && <p className="mt-3 text-sm text-reject">{error}</p>}
    </div>
  );
}
