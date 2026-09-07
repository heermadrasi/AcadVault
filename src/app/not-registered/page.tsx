import Link from "next/link";

export default function NotRegistered() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md">
        <p className="eyebrow mb-2">Access</p>
        <h1 className="font-serif text-2xl">This account isn&apos;t registered</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          AcadVault only admits Google accounts that the department office has added
          in advance. Ask the office to register your institute email, then sign in again.
        </p>
        <Link
          href="/auth/signout"
          className="mt-6 inline-flex h-9 items-center rounded border border-rule bg-white px-4 text-sm hover:bg-paper"
        >
          Sign out and try another account
        </Link>
      </div>
    </main>
  );
}
