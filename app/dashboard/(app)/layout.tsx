import type { Metadata } from "next";

import { fetchShellCounts } from "@/lib/dashboard/counts";
import { createClient } from "@/lib/supabase/server";

import { MobileNav } from "./_components/MobileNav";
import { ShellCountsProvider } from "./_components/ShellCountsProvider";
import { Sidebar } from "./_components/Sidebar";

export const metadata: Metadata = {
  title: {
    template: "%s · The Life Office",
    default: "Dashboard · The Life Office",
  },
};

export default async function DashboardAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await fetchShellCounts(await createClient());

  return (
    <ShellCountsProvider initialCounts={counts}>
      <div className="flex min-h-dvh flex-col bg-canvas text-ink md:flex-row">
        <MobileNav />
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </ShellCountsProvider>
  );
}
