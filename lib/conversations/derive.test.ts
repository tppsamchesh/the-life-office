import { describe, expect, it } from "vitest";

import { hasFailedOutbound, isUnread, lastMessageByConversation, sortThreads, type LiteMessage } from "./derive";

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
  it("is unread when the newest inbound is newer than last_read_at", () => {
    const messages = [msg({ created_at: "2026-07-06T12:05:00.000Z" })];
    expect(isUnread(messages, "c1", "2026-07-06T12:00:00.000Z")).toBe(true);
  });
  it("is read once the thread was opened after the newest inbound", () => {
    const messages = [msg({ created_at: "2026-07-06T12:05:00.000Z" })];
    expect(isUnread(messages, "c1", "2026-07-06T12:10:00.000Z")).toBe(false);
  });
  it("a never-opened thread with inbound is unread", () => {
    const messages = [msg({})];
    expect(isUnread(messages, "c1", null)).toBe(true);
  });
  it("agent and meg replies do not affect unread", () => {
    const messages = [
      msg({ direction: "outbound", author: "agent", created_at: "2026-07-06T12:10:00.000Z" }),
      msg({ direction: "outbound", author: "meg", created_at: "2026-07-06T12:09:00.000Z" }),
      msg({ created_at: "2026-07-06T12:05:00.000Z" }),
    ];
    expect(isUnread(messages, "c1", "2026-07-06T12:06:00.000Z")).toBe(false);
  });
  it("no inbound means not unread", () => {
    const messages = [msg({ direction: "outbound", author: "meg" })];
    expect(isUnread(messages, "c1", null)).toBe(false);
  });
});

describe("hasFailedOutbound", () => {
  it("flags a conversation with a failed outbound message", () => {
    const messages = [
      msg({ direction: "outbound", author: "meg", status: "failed" }),
      msg({ conversation_id: "c2", direction: "outbound", author: "meg", status: "sent" }),
    ];
    expect(hasFailedOutbound(messages, "c1")).toBe(true);
    expect(hasFailedOutbound(messages, "c2")).toBe(false);
  });
  it("ignores inbound statuses", () => {
    expect(hasFailedOutbound([msg({ status: "failed" })], "c1")).toBe(false);
  });
});

describe("sortThreads", () => {
  function thread(id: string, over: {
    state?: string; grace_deadline?: string | null; unread?: boolean; last?: string;
  }) {
    return {
      id,
      conversation: {
        state: over.state ?? "idle",
        grace_deadline: over.grace_deadline ?? null,
        updated_at: over.last ?? "2026-07-06T10:00:00.000Z",
      },
      unread: over.unread ?? false,
      lastMessage: over.last ? { created_at: over.last } : null,
    };
  }
  it("puts awaiting_meg first, soonest deadline first", () => {
    const sorted = sortThreads([
      thread("recent", { last: "2026-07-06T12:00:00.000Z" }),
      thread("later-deadline", { state: "awaiting_meg", grace_deadline: "2026-07-06T12:10:00.000Z" }),
      thread("soon-deadline", { state: "awaiting_meg", grace_deadline: "2026-07-06T12:02:00.000Z" }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["soon-deadline", "later-deadline", "recent"]);
  });
  it("then unread before read, newest first within each band", () => {
    const sorted = sortThreads([
      thread("read-new", { last: "2026-07-06T12:00:00.000Z" }),
      thread("unread-old", { unread: true, last: "2026-07-06T09:00:00.000Z" }),
      thread("unread-new", { unread: true, last: "2026-07-06T11:00:00.000Z" }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["unread-new", "unread-old", "read-new"]);
  });
});
