"use client";

import { useRouter } from "next/navigation";

import {
  ReconnectPill,
  useRealtimeChannel,
  useRefreshOnFocus,
} from "../../_components/realtime";

// Re-fetches the server-rendered inbox on task changes, with auto-resubscribe
// and a staleness pill while the channel is down.
export function RealtimeTasks() {
  const router = useRouter();
  useRefreshOnFocus();
  const status = useRealtimeChannel("triage-tasks", ["tasks"], () =>
    router.refresh(),
  );
  return status === "reconnecting" ? <ReconnectPill /> : null;
}
