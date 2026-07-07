import { describe, expect, it } from "vitest";

// Relative import: vitest.config.ts resolves no "@/" alias and this file runs under vitest.
import type { LiteMessage } from "../conversations/derive";

import { deliveryForApproved } from "./approved";

function msg(overrides: Partial<LiteMessage>): LiteMessage {
  return {
    conversation_id: "c1", direction: "outbound", author: "agent",
    body: "hi", created_at: "2026-07-07T12:10:00.000Z", status: "sent",
    ...overrides,
  };
}

const APPROVED_AT = "2026-07-07T12:00:00.000Z";

describe("deliveryForApproved", () => {
  it("is waiting when the task has no conversation or approval time", () => {
    expect(deliveryForApproved([], null, APPROVED_AT)).toBe("waiting");
    expect(deliveryForApproved([], "c1", null)).toBe("waiting");
  });
  it("is waiting when no outbound message exists after approval", () => {
    const messages = [msg({ created_at: "2026-07-07T11:00:00.000Z" })];
    expect(deliveryForApproved(messages, "c1", APPROVED_AT)).toBe("waiting");
  });
  it("reports the newest outbound status after approval", () => {
    const messages = [
      msg({ created_at: "2026-07-07T12:20:00.000Z", status: "delivered" }),
      msg({ created_at: "2026-07-07T12:10:00.000Z", status: "sent" }),
    ];
    expect(deliveryForApproved(messages, "c1", APPROVED_AT)).toBe("delivered");
  });
  it("ignores inbound messages and other conversations", () => {
    const messages = [
      msg({ direction: "inbound", author: "client", status: "received" }),
      msg({ conversation_id: "c2", status: "failed" }),
    ];
    expect(deliveryForApproved(messages, "c1", APPROVED_AT)).toBe("waiting");
  });
  it("surfaces a failed send", () => {
    const messages = [msg({ status: "failed" })];
    expect(deliveryForApproved(messages, "c1", APPROVED_AT)).toBe("failed");
  });
});
