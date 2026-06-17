import { describe, expect, it } from "vitest";

import { formatGBP, timeAgo } from "./format";

describe("formatGBP", () => {
  it("formats whole pounds with thousands separators", () => {
    expect(formatGBP(8200)).toBe("£8,200");
    expect(formatGBP(487)).toBe("£487");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-17T12:00:00Z");
  it("returns 'just now' under a minute", () => {
    expect(timeAgo("2026-06-17T11:59:30Z", now)).toBe("just now");
  });
  it("returns minutes, hours, days", () => {
    expect(timeAgo("2026-06-17T11:30:00Z", now)).toBe("30m ago");
    expect(timeAgo("2026-06-17T09:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-06-15T12:00:00Z", now)).toBe("2d ago");
  });
});
