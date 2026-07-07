import { describe, expect, it } from "vitest";

import { dayDividerLabel, graceCountdown, londonDayKey, londonTime, relativeTime, threadTitle } from "./format";

describe("threadTitle", () => {
  it("is family-first with the family member's name", () => {
    expect(threadTitle({ first_name: "Sarah", last_name: "Henderson" }, { first_name: "Tom" }))
      .toBe("Henderson · Tom");
  });
  it("uses the client themself when no family member is linked", () => {
    expect(threadTitle({ first_name: "Sarah", last_name: "Henderson" }, null))
      .toBe("Henderson · Sarah");
  });
  it("degrades gracefully without a last name", () => {
    expect(threadTitle({ first_name: "Priya", last_name: null }, null)).toBe("Priya");
  });
});

describe("graceCountdown", () => {
  const now = new Date("2026-07-06T12:00:00.000Z");
  it("renders whole minutes remaining, rounded up", () => {
    expect(graceCountdown("2026-07-06T12:03:12.000Z", now)).toEqual({ label: "4m", overdue: false });
  });
  it("renders exact minutes without rounding", () => {
    expect(graceCountdown("2026-07-06T12:03:00.000Z", now)).toEqual({ label: "3m", overdue: false });
  });
  it("renders bare overdue within the first minute past deadline", () => {
    expect(graceCountdown("2026-07-06T11:59:30.000Z", now)).toEqual({ label: "overdue", overdue: true });
  });
  it("renders overdue minutes past the deadline", () => {
    expect(graceCountdown("2026-07-06T11:47:00.000Z", now)).toEqual({ label: "overdue 13m", overdue: true });
  });
  it("returns null without a deadline", () => {
    expect(graceCountdown(null, now)).toBeNull();
  });
});

describe("londonDayKey", () => {
  it("keys by the London calendar day, not UTC", () => {
    // 23:30 UTC on 6 July is 00:30 BST on 7 July.
    expect(londonDayKey("2026-07-06T23:30:00.000Z")).toBe("2026-07-07");
    expect(londonDayKey("2026-07-06T12:00:00.000Z")).toBe("2026-07-06");
  });
});

describe("dayDividerLabel", () => {
  const now = new Date("2026-07-07T10:00:00.000Z");
  it("labels the current London day Today", () => {
    expect(dayDividerLabel("2026-07-07T08:00:00.000Z", now)).toBe("Today");
  });
  it("labels a late-UTC message on the same London day Today", () => {
    expect(dayDividerLabel("2026-07-06T23:30:00.000Z", now)).toBe("Today");
  });
  it("labels the previous London day Yesterday", () => {
    expect(dayDividerLabel("2026-07-06T12:00:00.000Z", now)).toBe("Yesterday");
  });
  it("labels older days with weekday, day and month", () => {
    expect(dayDividerLabel("2026-07-01T12:00:00.000Z", now)).toBe("Wednesday 1 July");
  });
});

describe("londonTime", () => {
  it("renders BST wall-clock time", () => {
    expect(londonTime("2026-07-07T14:30:00.000Z")).toBe("15:30");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-07-06T12:00:00.000Z");
  it("minutes", () => expect(relativeTime("2026-07-06T11:58:00.000Z", now)).toBe("2m"));
  it("hours", () => expect(relativeTime("2026-07-06T09:00:00.000Z", now)).toBe("3h"));
  it("days", () => expect(relativeTime("2026-07-02T12:00:00.000Z", now)).toBe("4d"));
  it("now for under a minute", () => expect(relativeTime("2026-07-06T11:59:40.000Z", now)).toBe("now"));
});
