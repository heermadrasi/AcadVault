"use client";
import { useState } from "react";

/**
 * Storage buckets are private. We never render a permanent URL — we mint a
 * short-lived signed URL on click, server-side, after re-checking permission.
 */
export function DownloadLink({
  bucket, path, children, className,
}: { bucket: string; path: string; children: React.ReactNode; className?: string }) {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/download?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
      );
      const json = await res.json();
      if (res.ok && json.url) window.open(json.url, "_blank", "noopener");
      else alert(json.error ?? "That file couldn't be opened.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={open} disabled={busy} className={className}>
      {busy ? "Opening…" : children}
    </button>
  );
}
