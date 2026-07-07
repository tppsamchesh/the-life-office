import type { LiteMessage } from "../conversations/derive";

export type DeliveryState =
  | "waiting" | "queued" | "sending" | "sent" | "delivered" | "failed" | "cancelled";

const KNOWN: DeliveryState[] = ["queued", "sending", "sent", "delivered", "failed", "cancelled"];

// What actually happened to an approved task's reply. There is no task->message
// foreign key (the daemon's task consumer is Plan 3), so we read the newest
// outbound message in the task's conversation created at/after approval.
// messagesDesc must be sorted newest-first.
export function deliveryForApproved(
  messagesDesc: LiteMessage[],
  conversationId: string | null,
  approvedAt: string | null,
): DeliveryState {
  if (!conversationId || !approvedAt) return "waiting";
  for (const m of messagesDesc) {
    if (m.conversation_id !== conversationId || m.direction !== "outbound") continue;
    if (m.created_at < approvedAt) break; // sorted desc: only older ones remain
    return KNOWN.includes(m.status as DeliveryState) ? (m.status as DeliveryState) : "waiting";
  }
  return "waiting";
}
