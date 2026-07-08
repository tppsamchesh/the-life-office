import type { DateEntry } from "./dates";

export type CalendarGroupKey = "week" | "month" | "later";
export type CalendarGroup = {
  key: CalendarGroupKey;
  label: string;
  items: DateEntry[];
};

const DAY_MS = 86_400_000;

function dateOnlyUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoAfterDays(today: Date, days: number): string {
  return new Date(today.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

// Buckets pre-sorted calendar entries into scannable horizons:
// "This week" = today..today+6, "This month" = today+7..today+30,
// "Later" = beyond. Empty groups are dropped. UTC date math matches
// how DateEntry dates are built in lib/clients/dates.ts.
export function groupCalendarEntries(
  entries: DateEntry[],
  now: Date = new Date(),
): CalendarGroup[] {
  const today = dateOnlyUTC(now);
  const weekEnd = isoAfterDays(today, 7); // exclusive
  const monthEnd = isoAfterDays(today, 31); // exclusive

  const groups: CalendarGroup[] = [
    { key: "week", label: "This week", items: [] },
    { key: "month", label: "This month", items: [] },
    { key: "later", label: "Later", items: [] },
  ];
  for (const e of entries) {
    if (e.date < weekEnd) groups[0].items.push(e);
    else if (e.date < monthEnd) groups[1].items.push(e);
    else groups[2].items.push(e);
  }
  return groups.filter((g) => g.items.length > 0);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// "2026-07-14" -> "Tue 14 Jul". Hand-rolled so output does not depend on the
// runtime's ICU data.
export function formatCalendarDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
