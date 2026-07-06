import { createClient } from "@/lib/supabase/server";

import { isHeartbeatLive } from "./heartbeat";

export type ConciergeStatus = {
  live: boolean;
  lastBeat: string | null;
  messagesToday: number;
  awaitingMeg: number;
  quarantined: number;
};

export async function getConciergeStatus(): Promise<ConciergeStatus> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [heartbeat, messages, awaiting, quarantine] = await Promise.all([
    supabase.from("service_heartbeats").select("beat_at").eq("service", "tlo-concierge").maybeSingle(),
    supabase.from("messages").select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase.from("conversations").select("*", { count: "exact", head: true })
      .eq("state", "awaiting_meg"),
    supabase.from("quarantined_messages").select("*", { count: "exact", head: true }),
  ]);

  const lastBeat = heartbeat.data?.beat_at ?? null;
  return {
    live: isHeartbeatLive(lastBeat),
    lastBeat,
    messagesToday: messages.count ?? 0,
    awaitingMeg: awaiting.count ?? 0,
    quarantined: quarantine.count ?? 0,
  };
}
