import { describe, expect, it } from "vitest";

import { isUnread, lastMessageByConversation, type LiteMessage } from "./derive";

function msg(overrides: Partial<LiteMessage>): LiteMessage {
  return {
    conversation_id: "c1", direction: "inbound", author: "client",
    body: "hi", created_at: "2026-07-06T12:00:00.000Z", status: "received",
    ...overrides,
  };
}

describe("lastMessageByConversation", () => {
  it("takes the first (newest) message per conversation from a desc list", () => {
    const messages = [
      msg({ conversation_id: "c1", body: "newest", created_at: "2026-07-06T12:05:00.000Z" }),
      msg({ conversation_id: "c2", body: "other" }),
      msg({ conversation_id: "c1", body: "older", created_at: "2026-07-06T11:00:00.000Z" }),
    ];
    const map = lastMessageByConversation(messages);
    expect(map.get("c1")?.body).toBe("newest");
    expect(map.get("c2")?.body).toBe("other");
  });
});

describe("isUnread", () => {
  it("is unread when the latest inbound is newer than Meg's latest message", () => {
    const messages = [
      msg({ created_at: "2026-07-06T12:05:00.000Z" }),
      msg({ direction: "outbound", author: "meg", created_at: "2026-07-06T12:00:00.000Z" }),
    ];
    expect(isUnread(messages, "c1")).toBe(true);
  });
  it("is read once Meg has replied after the last inbound", () => {
    const messages = [
      msg({ direction: "outbound", author: "meg", created_at: "2026-07-06T12:10:00.000Z" }),
      msg({ created_at: "2026-07-06T12:05:00.000Z" }),
    ];
    expect(isUnread(messages, "c1")).toBe(false);
  });
  it("agent replies do not mark a thread read", () => {
    const messages = [
      msg({ direction: "outbound", author: "agent", created_at: "2026-07-06T12:10:00.000Z" }),
      msg({ created_at: "2026-07-06T12:05:00.000Z" }),
    ];
    expect(isUnread(messages, "c1")).toBe(true);
  });
  it("no inbound means not unread", () => {
    const messages = [msg({ direction: "outbound", author: "meg" })];
    expect(isUnread(messages, "c1")).toBe(false);
  });
});
