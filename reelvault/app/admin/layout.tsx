import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getAdmin } from "@/lib/admin/auth";
import { NavLinks } from "./_ui/nav";

// Always rendered on request, never at build time (applies to every page below /admin).
export const dynamic = "force-dynamic";

// Never indexed, never cached. (The matching HTTP headers are set in next.config.ts.)
export const metadata: Metadata = {
  title: "ReelVault Admin",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const NAV = [
  ["/admin", "Overview"], ["/admin/users", "Users"], ["/admin/subscriptions", "Subscriptions"],
  ["/admin/payments", "Payments"], ["/admin/support", "Support"], ["/admin/log", "Activity log"], ["/admin/tables", "Database"],
] as const satisfies readonly (readonly [string, string])[];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // The layout only decides how the shell looks. Access to data is enforced where the data is read (lib/admin/data.ts).
  const admin = await getAdmin();
  if (!admin) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-zinc-900">{children}</div>;
  }
  return (
    <div className="min-h-screen bg-zinc-50 text-[15px] text-zinc-900 md:flex">
      <aside className="flex flex-col gap-3 bg-[#111111] p-3 text-zinc-300 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:p-4">
        <div className="flex items-center justify-between md:mb-3 md:px-2">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="inline-block h-6 w-6 rounded-md bg-[#C5FF00]" aria-hidden /> ReelVault <span className="text-xs font-medium text-zinc-500">admin</span>
          </div>
        </div>
        <NavLinks items={NAV} />
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs md:flex-col md:items-stretch">
          <div className="truncate text-zinc-400" title={admin.email}>{admin.email}</div>
          <form action="/admin/logout" method="post">
            <button className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
        <p className="mx-auto mt-16 max-w-5xl text-xs text-zinc-400">All times are in UTC. Suspensions and deletions made here are recorded in the activity log.</p>
      </main>
    </div>
  );
}
