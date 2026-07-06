import { describe, expect, it } from "vitest";

import { isHeartbeatLive } from "./heartbeat";

describe("isHeartbeatLive", () => {
  const now = new Date("2026-07-06T12:00:00Z");

  it("returns false when there is no heartbeat", () => {
    expect(isHeartbeatLive(null, now)).toBe(false);
  });

  it("returns true within the live window", () => {
    expect(isHeartbeatLive("2026-07-06T11:59:00Z", now)).toBe(true);
  });

  it("returns true right at the live window boundary minus a second", () => {
    expect(isHeartbeatLive("2026-07-06T11:58:01Z", now)).toBe(true);
  });

  it("returns false once the heartbeat is older than the live window", () => {
    expect(isHeartbeatLive("2026-07-06T11:57:00Z", now)).toBe(false);
  });

  it("returns false for a heartbeat far in the past", () => {
    expect(isHeartbeatLive("2026-07-01T12:00:00Z", now)).toBe(false);
  });
});
