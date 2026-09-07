import { GoogleButton } from "@/components/GoogleButton";

/**
 * The right panel previews the compliance grid — the one screen this product
 * exists to produce. Static, no data, purely a thesis for what you get inside.
 */
const GRID = [
  [3, 3, 2, 1, 0, 3, 2], [3, 2, 2, 3, 1, 3, 3], [2, 1, 0, 0, 1, 2, 3],
  [3, 3, 3, 2, 3, 3, 2], [1, 0, 1, 1, 0, 2, 1], [3, 2, 3, 3, 2, 3, 3],
  [2, 3, 1, 0, 3, 1, 2], [3, 3, 3, 3, 3, 2, 3],
];
const TONE = ["bg-rule", "bg-overdue/70", "bg-archive/40", "bg-archive"];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex items-center justify-center px-6 py-16 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-baseline gap-2">
            <span className="font-serif text-xl font-semibold tracking-tight">AcadVault</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Dept. records
            </span>
          </div>

          <h1 className="font-serif text-[32px] leading-[1.15]">
            Every document,<br />filed where it belongs.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Sign in with your institute Google account. Accounts are registered by the
            department office in advance — if yours isn&apos;t listed yet, ask them to add it.
          </p>

          <div className="mt-8">
            <GoogleButton />
          </div>

          <p className="mt-6 font-mono text-[11px] leading-relaxed text-muted">
            Faculty see only their own record. Admin access is granted by email, not by role selection.
          </p>
        </div>
      </div>

      {/* Signature element: the department at a glance. */}
      <aside className="hidden items-center justify-center border-l border-rule bg-white px-12 lg:flex">
        <div className="w-full max-w-md">
          <p className="eyebrow mb-5">Submission register — preview</p>
          <div className="rounded-md border border-rule p-5">
            <div className="grid grid-cols-7 gap-1.5">
              {GRID.flatMap((row, r) =>
                row.map((v, c) => (
                  <div key={`${r}-${c}`} className={`aspect-square rounded-[2px] ${TONE[v]}`} />
                ))
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-rule pt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {[["bg-archive", "Approved"], ["bg-archive/40", "Submitted"],
                ["bg-overdue/70", "Overdue"], ["bg-rule", "Awaiting"]].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />{l}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">
            Rows are faculty. Columns are tasks. One glance tells the office who to chase.
          </p>
        </div>
      </aside>
    </main>
  );
}
