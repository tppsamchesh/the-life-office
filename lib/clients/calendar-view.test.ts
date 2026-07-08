import { describe, expect, it } from "vitest";

import type { DateEntry } from "./dates";
import { formatCalendarDate, groupCalendarEntries } from "./calendar-view";

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
