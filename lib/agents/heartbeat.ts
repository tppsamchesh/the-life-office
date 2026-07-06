// Pure heartbeat-freshness classification, split out from concierge.ts so it can be
// unit tested without pulling in the Supabase server client (mirrors lib/conversations/derive.ts).
const LIVE_WINDOW_MS = 2 * 60 * 1000;

// A null heartbeat (daemon never checked in) is treated as not live, same as a stale one.
export function isHeartbeatLive(lastBeat: string | null, now: Date = new Date()): boolean {
  if (lastBeat === null) return false;
  return now.getTime() - new Date(lastBeat).getTime() < LIVE_WINDOW_MS;
}
