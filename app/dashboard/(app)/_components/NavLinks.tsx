"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { formatCount, type ShellCounts } from "@/lib/dashboard/counts";

import { signOut } from "../actions";
import { Chip } from "./ui";
import { useShellCounts } from "./ShellCountsProvider";

const NAV: { href: string; label: string; count: keyof ShellCounts | null }[] = [
  { href: "/dashboard/triage", label: "Triage", count: "pendingTriage" },
  { href: "/dashboard/conversations", label: "Conversations", count: "awaitingMeg" },
  { href: "/dashboard/clients", label: "Clients", count: null },
  { href: "/dashboard/leads", label: "Leads", count: null },
  { href: "/dashboard/calendar", label: "Calendar", count: null },
  { href: "/dashboard/finances", label: "Finances", count: null },
  { href: "/dashboard/agents", label: "Agents", count: null },
];

// The shared nav body used by the desktop sidebar and the mobile drawer.
// Chips are quiet, tabular-nums, and vanish at zero, so an unadorned nav
// itself means "all clear". Amber marks only what awaits Meg; quarantine
// wears a neutral chip with an alert-tone dot.
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { counts } = useShellCounts();

  const quarantineActive = pathname.startsWith(
    "/dashboard/conversations/quarantine",
  );

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard/conversations"
              ? pathname.startsWith(item.href) && !quarantineActive
              : pathname.startsWith(item.href);
          const count = item.count ? counts[item.count] : 0;
          return (
            <Fragment key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-l-2 border-sage bg-surface font-medium text-ink"
                    : "text-muted hover:bg-surface/60"
                }`}
              >
                <span>{item.label}</span>
                {count > 0 ? (
                  <Chip tone="amber">
                    <span className="tabular-nums">{formatCount(count)}</span>
                  </Chip>
                ) : null}
              </Link>
              {item.href === "/dashboard/conversations" ? (
                <Link
                  href="/dashboard/conversations/quarantine"
                  onClick={onNavigate}
                  className={`flex min-h-11 items-center justify-between rounded-md py-2 pl-6 pr-3 text-sm transition-colors ${
                    quarantineActive
                      ? "border-l-2 border-sage bg-surface font-medium text-ink"
                      : "text-muted hover:bg-surface/60"
                  }`}
                >
                  <span>Quarantine</span>
                  {counts.quarantined > 0 ? (
                    <Chip tone="neutral">
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-alert" />
                      <span className="tabular-nums">
                        {formatCount(counts.quarantined)}
                      </span>
                    </Chip>
                  ) : null}
                </Link>
              ) : null}
            </Fragment>
          );
        })}
      </nav>

      <form action={signOut} className="mt-auto px-3 pb-5 pt-6">
        <button
          type="submit"
          className="min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-surface/60"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
