export type LiteMessage = {
  conversation_id: string;
  direction: string;
  author: string;
  body: string;
  created_at: string;
  status: string;
};

// messagesDesc must be sorted newest-first.
export function lastMessageByConversation(messagesDesc: LiteMessage[]): Map<string, LiteMessage> {
  const map = new Map<string, LiteMessage>();
  for (const m of messagesDesc) {
    if (!map.has(m.conversation_id)) map.set(m.conversation_id, m);
  }
  return map;
}

// Unread = the newest inbound message arrived after Meg last opened the
// thread (conversations.last_read_at). Opening marks read; agent replies and
// Meg's own sends are irrelevant.
export function isUnread(
  messagesDesc: LiteMessage[],
  conversationId: string,
  lastReadAt: string | null,
): boolean {
  for (const m of messagesDesc) {
    if (m.conversation_id !== conversationId || m.direction !== "inbound") continue;
    return lastReadAt === null || m.created_at > lastReadAt;
  }
  return false;
}

export function hasFailedOutbound(messagesDesc: LiteMessage[], conversationId: string): boolean {
  return messagesDesc.some(
    (m) => m.conversation_id === conversationId && m.direction === "outbound" && m.status === "failed",
  );
}

export type SortableThread = {
  conversation: { state: string; grace_deadline: string | null; updated_at: string };
  unread: boolean;
  lastMessage: { created_at: string } | null;
};

// awaiting_meg threads first (soonest grace deadline first, deadline-less
// last), then unread before read, then most recent activity first.
export function sortThreads<T extends SortableThread>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aAwait = a.conversation.state === "awaiting_meg";
    const bAwait = b.conversation.state === "awaiting_meg";
    if (aAwait !== bAwait) return aAwait ? -1 : 1;
    if (aAwait && bAwait) {
      const aD = a.conversation.grace_deadline ?? "9999";
      const bD = b.conversation.grace_deadline ?? "9999";
      if (aD !== bD) return aD < bD ? -1 : 1;
    }
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    const aT = a.lastMessage?.created_at ?? a.conversation.updated_at;
    const bT = b.lastMessage?.created_at ?? b.conversation.updated_at;
    return aT < bT ? 1 : -1;
  });
}
