"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function ReviewControls({
  assignmentId, status,
}: { assignmentId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [showRemarks, setShowRemarks] = useState(false);

  async function review(next: "approved" | "rejected") {
    if (next === "rejected" && !showRemarks) return setShowRemarks(true);
    setBusy(true);
    await fetch(`/api/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, remarks: remarks || null }),
    });
    setBusy(false);
    setShowRemarks(false);
    router.refresh();
  }

  if (status === "pending") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showRemarks && (
        <input
          className="field h-8 w-56 py-1"
          placeholder="What needs fixing?"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          autoFocus
        />
      )}
      {status !== "approved" && (
        <Button size="sm" onClick={() => review("approved")} disabled={busy}>Approve</Button>
      )}
      <Button size="sm" variant="danger" onClick={() => review("rejected")} disabled={busy}>
        {showRemarks ? "Send back" : "Send back"}
      </Button>
    </div>
  );
}
