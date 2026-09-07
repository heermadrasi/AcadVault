import * as React from "react";
import type { AssignmentStatus } from "@/lib/types";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Button ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "primary", size = "md", className, ...rest
}: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-4 text-sm" };
  const variants = {
    primary: "bg-archive text-white hover:bg-archive-deep",
    outline: "border border-rule bg-white text-ink hover:bg-paper",
    ghost: "text-muted hover:bg-rule/50 hover:text-ink",
    danger: "border border-reject/30 bg-reject-soft text-reject hover:bg-reject/10",
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} {...rest} />;
}

/* ---------- Status stamp ----------
   One vocabulary for status across the matrix, the task list and the
   faculty folder, so the same colour always means the same thing. */
const STAMP: Record<AssignmentStatus | "overdue", { label: string; cls: string }> = {
  pending:   { label: "Not submitted", cls: "bg-pending-soft text-pending border-pending/30" },
  overdue:   { label: "Overdue",       cls: "bg-overdue-soft text-overdue border-overdue/30" },
  submitted: { label: "Submitted",     cls: "bg-archive-soft text-archive border-archive/25" },
  approved:  { label: "Approved",      cls: "bg-archive text-white border-archive" },
  rejected:  { label: "Sent back",     cls: "bg-reject-soft text-reject border-reject/30" },
};

export function Stamp({
  status, overdue = false, className,
}: { status: AssignmentStatus; overdue?: boolean; className?: string }) {
  const key = status === "pending" && overdue ? "overdue" : status;
  const s = STAMP[key];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]",
        s.cls, className
      )}
    >
      {s.label}
    </span>
  );
}

export function stampCellClass(status: AssignmentStatus, overdue: boolean) {
  if (status === "approved") return "bg-archive";
  if (status === "submitted") return "bg-archive/40";
  if (status === "rejected") return "bg-reject/60";
  if (overdue) return "bg-overdue/70";
  return "bg-rule";
}

/* ---------- Layout primitives ---------- */
export function PageHeader({
  eyebrow, title, action, children,
}: {
  eyebrow?: string; title: string;
  action?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-rule pb-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="font-serif text-[26px] leading-tight">{title}</h1>
          {children && <div className="mt-2 max-w-2xl text-sm text-muted">{children}</div>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Panel({
  title, action, children, className,
}: {
  title?: string; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-rule bg-card shadow-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          {title && <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title, hint, action,
}: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-serif text-lg">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{hint}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, tone = "ink" }: {
  label: string; value: React.ReactNode; tone?: "ink" | "archive" | "overdue";
}) {
  const tones = { ink: "text-ink", archive: "text-archive", overdue: "text-overdue" };
  return (
    <div className="rounded-md border border-rule bg-card px-4 py-3 shadow-card">
      <p className="eyebrow">{label}</p>
      <p className={cn("tabular mt-1 font-mono text-2xl", tones[tone])}>{value}</p>
    </div>
  );
}

export function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
