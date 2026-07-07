"use client";

import { useEffect } from "react";

import { markConversationRead } from "../actions";

// Marks the thread read when Meg opens it, and again when a new message
// arrives while she is looking (latestMessageAt changes on realtime refresh).
export function MarkRead({
  conversationId,
  unread,
  latestMessageAt,
}: {
  conversationId: string;
  unread: boolean;
  latestMessageAt: string | null;
}) {
  useEffect(() => {
    if (unread) void markConversationRead(conversationId);
  }, [conversationId, unread, latestMessageAt]);

  return null;
}
