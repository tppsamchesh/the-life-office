import { describe, expect, it } from "vitest";

import { snoozePresets } from "./snooze";

// Constructed via local-time APIs so assertions are timezone-independent.
function local(y: number, mo: number, d: number, h: number, mi = 0): Date {
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

describe("snoozePresets", () => {
  it("offers this evening at 18:00 while it is still ahead", () => {
    const now = local(2026, 7, 7, 10); // Tuesday morning
    const presets = snoozePresets(now);
    expect(presets[0].label).toBe("This evening (18:00)");
    expect(presets[0].iso).toBe(local(2026, 7, 7, 18).toISOString());
  });
  it("drops this evening once 18:00 has passed", () => {
    const now = local(2026, 7, 7, 19);
    expect(snoozePresets(now).map((p) => p.label)).toEqual([
      "Tomorrow (09:00)",
      "Monday (09:00)",
    ]);
  });
  it("tomorrow is 09:00 the next day", () => {
    const now = local(2026, 7, 7, 10);
    const tomorrow = snoozePresets(now).find((p) => p.label === "Tomorrow (09:00)");
    expect(tomorrow?.iso).toBe(local(2026, 7, 8, 9).toISOString());
  });
  it("monday rolls to next week when today is Monday", () => {
    const now = local(2026, 7, 6, 10); // Monday 6 July 2026
    const monday = snoozePresets(now).find((p) => p.label === "Monday (09:00)");
    expect(monday?.iso).toBe(local(2026, 7, 13, 9).toISOString());
  });
  it("monday lands on the coming Monday midweek", () => {
    const now = local(2026, 7, 8, 10); // Wednesday
    const monday = snoozePresets(now).find((p) => p.label === "Monday (09:00)");
    expect(monday?.iso).toBe(local(2026, 7, 13, 9).toISOString());
  });
});
