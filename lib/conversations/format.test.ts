import { describe, expect, it } from "vitest";

import { graceCountdown, relativeTime, threadTitle } from "./format";

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
  it("renders minutes and seconds", () => {
    expect(graceCountdown("2026-07-06T12:03:12.000Z", now)).toBe("3m 12s");
  });
  it("renders seconds only under a minute", () => {
    expect(graceCountdown("2026-07-06T12:00:45.000Z", now)).toBe("45s");
  });
  it("clamps past deadlines to now", () => {
    expect(graceCountdown("2026-07-06T11:59:00.000Z", now)).toBe("now");
  });
  it("returns null without a deadline", () => {
    expect(graceCountdown(null, now)).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-07-06T12:00:00.000Z");
  it("minutes", () => expect(relativeTime("2026-07-06T11:58:00.000Z", now)).toBe("2m"));
  it("hours", () => expect(relativeTime("2026-07-06T09:00:00.000Z", now)).toBe("3h"));
  it("days", () => expect(relativeTime("2026-07-02T12:00:00.000Z", now)).toBe("4d"));
  it("now for under a minute", () => expect(relativeTime("2026-07-06T11:59:40.000Z", now)).toBe("now"));
});
