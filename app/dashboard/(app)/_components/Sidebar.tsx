"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "../actions";

const NAV = [
  { href: "/dashboard/triage", label: "Triage" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/finances", label: "Finances" },
  { href: "/dashboard/agents", label: "Agents" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-[#EFEBE4] border-r border-[#D8D2C8] flex flex-col">
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
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-white text-[#1F1F1F] font-medium border-l-2 border-[#A8B2A1]"
                  : "text-[#6B665D] hover:bg-white/60"
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
          className="w-full text-left rounded-md px-3 py-2 text-sm text-[#8A857B] hover:bg-white/60"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
