import { requireAdmin } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Register", exact: true },
  { href: "/admin/faculty", label: "Faculty" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/templates", label: "Report templates" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  return (
    <AppShell profile={profile} nav={NAV} subtitle="Department office">
      {children}
    </AppShell>
  );
}
