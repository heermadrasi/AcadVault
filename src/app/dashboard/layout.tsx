import { requireFaculty } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/AppShell";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "My tasks", exact: true },
];

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireFaculty();
  return (
    <AppShell profile={profile} nav={NAV} subtitle="Faculty">
      {children}
    </AppShell>
  );
}
