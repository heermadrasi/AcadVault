"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";

export type NavItem = { href: string; label: string; exact?: boolean };

export function AppShell({
  profile, nav, subtitle, children,
}: {
  profile: Profile; nav: NavItem[]; subtitle: string; children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const initials = (profile.full_name ?? profile.email)
    .split(/[\s.@]+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase()).join("");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[228px_1fr]">
      <aside className="border-b border-rule bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="border-b border-rule px-5 py-5">
            <p className="font-serif text-lg font-semibold leading-none">AcadVault</p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {subtitle}
            </p>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:overflow-visible">
            {nav.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-archive-soft font-medium text-archive-deep"
                      : "text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden border-t border-rule px-4 py-4 lg:block">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-archive-soft font-mono text-[11px] text-archive-deep">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium leading-tight">
                  {profile.full_name ?? "—"}
                </p>
                <p className="truncate font-mono text-[10px] text-muted">{profile.email}</p>
              </div>
            </div>
            <Link
              href="/auth/signout"
              className="mt-3 block rounded px-2 py-1.5 text-[13px] text-muted hover:bg-paper hover:text-ink"
            >
              Sign out
            </Link>
          </div>
        </div>
      </aside>

      <main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
