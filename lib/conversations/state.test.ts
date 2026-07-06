import { describe, expect, it } from "vitest";

import { onHandBack, onInbound, onMegSend, takeOver, type ConvState } from "./state";

const NOW = "2026-07-06T12:00:00.000Z";
const IDLE: ConvState = { state: "idle", agent_paused: false, grace_deadline: null };

describe("onMegSend", () => {
  it("silences the agent and kills the timer", () => {
    expect(onMegSend()).toEqual({ state: "meg_active", agent_paused: true, grace_deadline: null });
  });
});

describe("takeOver", () => {
  it("matches onMegSend", () => {
    expect(takeOver()).toEqual(onMegSend());
  });
});

describe("onHandBack", () => {
  it("resets to idle and unpauses", () => {
    expect(onHandBack()).toEqual({ state: "idle", agent_paused: false, grace_deadline: null });
  });
});

describe("onInbound", () => {
  it("arms the grace timer from now", () => {
    const next = onInbound(IDLE, NOW, 240);
    expect(next.state).toBe("awaiting_meg");
    expect(next.agent_paused).toBe(false);
    expect(next.grace_deadline).toBe("2026-07-06T12:04:00.000Z");
  });

  it("does not arm the timer when Meg has taken over", () => {
    const current: ConvState = { state: "meg_active", agent_paused: true, grace_deadline: null };
    expect(onInbound(current, NOW, 240)).toEqual({
      state: "meg_active", agent_paused: true, grace_deadline: null,
    });
  });
});
