"use client";

import Link from "next/link";
import { useState } from "react";

import { buildMonthGrid } from "@/lib/clients/calendar-view";
import type { DateEntry } from "@/lib/clients/dates";

const MONTH_LABEL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const WEEKDAY_LABEL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const NAV_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1";

export function CalendarGrid({
  entries,
  selected,
  today,
}: {
  entries: DateEntry[];
  selected: string;
  today: string;
}) {
  const initialMonth = selected !== "all" ? selected.slice(0, 7) : today.slice(0, 7);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth); // "YYYY-MM"

  const [yearStr, monthStr] = visibleMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed
  const cells = buildMonthGrid(year, month);

  const countByDate = new Map<string, number>();
  for (const e of entries) countByDate.set(e.date, (countByDate.get(e.date) ?? 0) + 1);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setVisibleMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className={NAV_BUTTON}>
          ←
        </button>
        <p className="font-serif text-lg">
          {MONTH_LABEL[month]} {year}
        </p>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className={NAV_BUTTON}>
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
        {WEEKDAY_LABEL.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isToday = cell.date === today;
          const isSelected = cell.date === selected;
          const count = countByDate.get(cell.date) ?? 0;
          return (
            <Link
              key={cell.date}
              href={`/dashboard/calendar?date=${cell.date}`}
              className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1 ${
                isSelected
                  ? "bg-sage font-medium text-white"
                  : isToday
                    ? "border border-sage-deep text-ink hover:bg-inset"
                    : cell.inMonth
                      ? "text-ink hover:bg-inset"
                      : "text-faint hover:bg-inset"
              }`}
            >
              <span>{Number(cell.date.slice(8, 10))}</span>
              {!isSelected && count > 0 ? (
                <span aria-hidden className="h-1 w-1 rounded-full bg-sage-deep" />
              ) : (
                <span aria-hidden className="h-1 w-1" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
