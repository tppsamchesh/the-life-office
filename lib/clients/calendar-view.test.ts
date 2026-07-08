import { describe, expect, it } from "vitest";

import type { DateEntry } from "./dates";
import {
  buildMonthGrid,
  earliestEntry,
  entriesForDate,
  formatCalendarDate,
  groupCalendarEntries,
  todayIso,
} from "./calendar-view";

function entry(id: string, date: string): DateEntry {
  return {
    id,
    label: `Entry ${id}`,
    date,
    category: "household",
    clientId: "c1",
    clientName: "The Test Household",
  };
}

// 2026-07-07 is a Tuesday.
const NOW = new Date("2026-07-07T09:30:00Z");

describe("groupCalendarEntries", () => {
  it("buckets by horizon: week = next 7 days, month = next 31, later = beyond", () => {
    const groups = groupCalendarEntries(
      [
        entry("today", "2026-07-07"),
        entry("week-edge", "2026-07-13"), // today + 6 → week
        entry("month-start", "2026-07-14"), // today + 7 → month
        entry("month-edge", "2026-08-06"), // today + 30 → month
        entry("later", "2026-08-07"), // today + 31 → later
      ],
      NOW,
    );
    expect(groups.map((g) => g.label)).toEqual(["This week", "This month", "Later"]);
    expect(groups[0].items.map((e) => e.id)).toEqual(["today", "week-edge"]);
    expect(groups[1].items.map((e) => e.id)).toEqual(["month-start", "month-edge"]);
    expect(groups[2].items.map((e) => e.id)).toEqual(["later"]);
  });

  it("drops empty groups so quiet horizons add no headers", () => {
    const groups = groupCalendarEntries([entry("far", "2027-01-01")], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("later");
  });

  it("returns nothing for no entries", () => {
    expect(groupCalendarEntries([], NOW)).toEqual([]);
  });
});

describe("formatCalendarDate", () => {
  it("renders a scannable weekday + day + month", () => {
    expect(formatCalendarDate("2026-07-14")).toBe("Tue 14 Jul");
    expect(formatCalendarDate("2026-12-25")).toBe("Fri 25 Dec");
  });
});

describe("buildMonthGrid", () => {
  it("returns a 6-week grid starting on Monday and ending on Sunday", () => {
    const cells = buildMonthGrid(2026, 6); // July 2026 (0-indexed: 6 = July)
    expect(cells).toHaveLength(42);
    const firstWeekday = new Date(`${cells[0].date}T00:00:00Z`).getUTCDay();
    const lastWeekday = new Date(`${cells[41].date}T00:00:00Z`).getUTCDay();
    expect(firstWeekday).toBe(1); // Monday
    expect(lastWeekday).toBe(0); // Sunday
  });

  it("marks exactly the days of the target month as inMonth, contiguous and ascending", () => {
    const cells = buildMonthGrid(2026, 6); // July has 31 days
    const inMonth = cells.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].date).toBe("2026-07-01");
    expect(inMonth[30].date).toBe("2026-07-31");
    for (let i = 1; i < inMonth.length; i++) {
      const prev = new Date(`${inMonth[i - 1].date}T00:00:00Z`);
      const next = new Date(`${inMonth[i].date}T00:00:00Z`);
      expect(next.getTime() - prev.getTime()).toBe(86_400_000);
    }
  });

  it("fills leading and trailing days from adjacent months", () => {
    const cells = buildMonthGrid(2026, 6);
    const firstInMonthIndex = cells.findIndex((c) => c.inMonth);
    const lastInMonthIndex = cells.length - 1 - [...cells].reverse().findIndex((c) => c.inMonth);
    expect(firstInMonthIndex).toBeGreaterThan(0); // July 1, 2026 is not a Monday
    expect(cells.slice(0, firstInMonthIndex).every((c) => !c.inMonth)).toBe(true);
    expect(cells.slice(lastInMonthIndex + 1).every((c) => !c.inMonth)).toBe(true);
  });

  it("handles a December to January year rollover", () => {
    const cells = buildMonthGrid(2026, 11); // December 2026
    const inMonth = cells.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31); // December always has 31 days
    expect(inMonth[0].date).toBe("2026-12-01");
    expect(inMonth[30].date).toBe("2026-12-31");
    const trailing = cells.filter((c) => !c.inMonth && c.date > "2026-12-31");
    expect(trailing.length).toBeGreaterThan(0);
    for (const c of trailing) expect(c.date.startsWith("2027-01")).toBe(true);
  });
});

describe("entriesForDate", () => {
  it("returns only entries matching the given date", () => {
    const entries = [entry("a", "2026-07-07"), entry("b", "2026-07-08"), entry("c", "2026-07-07")];
    expect(entriesForDate(entries, "2026-07-07").map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(entriesForDate([entry("a", "2026-07-07")], "2026-08-01")).toEqual([]);
  });
});

describe("earliestEntry", () => {
  it("returns the entry with the earliest date", () => {
    const entries = [entry("later", "2026-08-01"), entry("soonest", "2026-07-08"), entry("mid", "2026-07-20")];
    expect(earliestEntry(entries)?.id).toBe("soonest");
  });

  it("returns null for an empty list", () => {
    expect(earliestEntry([])).toBeNull();
  });
});

describe("todayIso", () => {
  it("returns the date-only ISO string for the given instant", () => {
    expect(todayIso(NOW)).toBe("2026-07-07");
  });

  it("defaults to the current instant when no argument is given", () => {
    expect(todayIso()).toBe(new Date().toISOString().slice(0, 10));
  });
});
