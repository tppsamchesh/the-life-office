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

export function isUnread(messagesDesc: LiteMessage[], conversationId: string): boolean {
  let latestInbound: string | null = null;
  let latestMeg: string | null = null;
  for (const m of messagesDesc) {
    if (m.conversation_id !== conversationId) continue;
    if (m.direction === "inbound" && latestInbound === null) latestInbound = m.created_at;
    if (m.author === "meg" && latestMeg === null) latestMeg = m.created_at;
    if (latestInbound !== null && latestMeg !== null) break;
  }
  if (latestInbound === null) return false;
  return latestMeg === null || latestInbound > latestMeg;
}
