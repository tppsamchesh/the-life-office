"use client";

import { useRouter } from "next/navigation";

import {
  ReconnectPill,
  useRealtimeChannel,
  useRefreshOnFocus,
} from "../../_components/realtime";

// Refreshes the board when leads change, with auto-resubscribe and a
// staleness pill while the channel is down.
export function RealtimeLeads() {
  const router = useRouter();
  useRefreshOnFocus();
  const status = useRealtimeChannel("leads-board", ["leads"], () =>
    router.refresh(),
  );
  return status === "reconnecting" ? <ReconnectPill /> : null;
}
