"use client";

import { useRouter } from "next/navigation";

import {
  ReconnectPill,
  useRealtimeChannel,
  useRefreshOnFocus,
} from "../../_components/realtime";

// Re-fetches the server-rendered view whenever conversations or messages
// change, with auto-resubscribe and a staleness pill while the channel is down.
export function RealtimeConversations() {
  const router = useRouter();
  useRefreshOnFocus();
  const status = useRealtimeChannel(
    "conversations-live",
    ["conversations", "messages"],
    () => router.refresh(),
  );
  return status === "reconnecting" ? <ReconnectPill /> : null;
}
