"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const hd = process.env.NEXT_PUBLIC_GOOGLE_HD;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // `hd` pre-filters Google's account chooser to the institution.
        // It is a convenience hint. The database trigger is the real gate.
        queryParams: hd ? { hd, prompt: "select_account" } : { prompt: "select_account" },
      },
    });
    if (error) { setError("Google sign-in didn't start. Try again."); setBusy(false); }
  }

  return (
    <div>
      <button
        onClick={signIn}
        disabled={busy}
        className="inline-flex h-11 w-full items-center justify-center gap-3 rounded border border-rule bg-white px-5 text-sm font-medium transition-colors hover:bg-paper disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
          <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
        </svg>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && <p className="mt-3 text-sm text-reject">{error}</p>}
    </div>
  );
}
