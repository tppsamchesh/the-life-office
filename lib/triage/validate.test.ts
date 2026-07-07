import { describe, expect, it } from "vitest";

import { parseSnoozeUntil } from "./validate";

const NOW = new Date("2026-07-07T12:00:00.000Z");

describe("parseSnoozeUntil", () => {
  it("rejects an empty value", () => {
    expect(parseSnoozeUntil("", NOW)).toEqual({ error: "Pick a date to snooze until." });
  });

  it("rejects an unparseable date (previously a silent redirect)", () => {
    expect(parseSnoozeUntil("not-a-date", NOW)).toEqual({ error: "That isn't a valid date." });
  });

  it("rejects a past date", () => {
    expect(parseSnoozeUntil("2020-01-01", NOW)).toEqual({
      error: "Snooze date must be in the future.",
    });
  });

  it("rejects today (date inputs parse to midnight, which is already past)", () => {
    expect(parseSnoozeUntil("2026-07-07", NOW)).toEqual({
      error: "Snooze date must be in the future.",
    });
  });

  it("accepts a future date and returns an ISO string", () => {
    expect(parseSnoozeUntil("2026-07-08", NOW)).toEqual({
      until: "2026-07-08T00:00:00.000Z",
    });
  });
});
