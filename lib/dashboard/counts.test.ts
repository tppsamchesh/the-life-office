import { describe, expect, it } from "vitest";

import { formatCount, inboxFilter } from "./counts";

describe("inboxFilter", () => {
  it("matches pending tasks and elapsed snoozes, like the triage inbox", () => {
    expect(inboxFilter("2026-07-07T09:00:00.000Z")).toBe(
      "status.eq.pending,and(status.eq.snoozed,snoozed_until.lte.2026-07-07T09:00:00.000Z)",
    );
  });
});

describe("formatCount", () => {
  it("renders small counts as-is", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(3)).toBe("3");
    expect(formatCount(99)).toBe("99");
  });

  it("caps at 99+ so sidebar chips stay narrow", () => {
    expect(formatCount(100)).toBe("99+");
    expect(formatCount(2400)).toBe("99+");
  });
});
