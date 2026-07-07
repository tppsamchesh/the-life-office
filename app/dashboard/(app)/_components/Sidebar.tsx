"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "../actions";

const NAV = [
  { href: "/dashboard/triage", label: "Triage" },
  { href: "/dashboard/conversations", label: "Conversations" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/finances", label: "Finances" },
  { href: "/dashboard/agents", label: "Agents" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-inset border-r border-edge flex flex-col">
      <div className="px-5 py-6">
        <span className="font-serif text-lg tracking-wide">The Life Office</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1 ${
                active
                  ? "bg-surface text-ink font-medium border-l-2 border-sage"
                  : "text-muted hover:bg-surface/60"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-auto px-3 pb-5">
        <button
          type="submit"
          className="w-full text-left rounded-md px-3 py-2 text-sm text-muted hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
