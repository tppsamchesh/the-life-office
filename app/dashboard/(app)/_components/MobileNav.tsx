"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { NavLinks } from "./NavLinks";
import { useShellCounts } from "./ShellCountsProvider";

// Below md: a sticky top bar with a 44px hamburger opening a left slide-over
// drawer. The hamburger carries an amber dot whenever anything awaits Meg,
// so "all clear" is readable even with the drawer closed.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { counts } = useShellCounts();
  const needsMeg = counts.pendingTriage + counts.awaitingMeg > 0;

  // Close the drawer on any navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b border-edge bg-inset pl-4 pr-1 md:hidden">
        <span className="font-serif text-base tracking-wide">
          The Life Office
        </span>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="relative flex h-11 w-11 items-center justify-center rounded-md text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {needsMeg ? (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber" />
          ) : null}
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/20"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-inset shadow-lg">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-edge pl-4 pr-1">
              <span className="font-serif text-base tracking-wide">
                The Life Office
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M4 4l10 10M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
