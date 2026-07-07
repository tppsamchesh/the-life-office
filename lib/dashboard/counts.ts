import type { SupabaseClient } from "@supabase/supabase-js";

export type ShellCounts = {
  pendingTriage: number;
  awaitingMeg: number;
  quarantined: number;
};

export const ZERO_COUNTS: ShellCounts = {
  pendingTriage: 0,
  awaitingMeg: 0,
  quarantined: 0,
};

// Same predicate as getInboxTasks in lib/triage/queries.ts: pending tasks,
// plus snoozed tasks whose snooze has elapsed. Keep the two in sync.
export function inboxFilter(nowIso: string): string {
  return `status.eq.pending,and(status.eq.snoozed,snoozed_until.lte.${nowIso})`;
}

// Sidebar chips stay narrow: cap the rendered count at 99+.
export function formatCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

// Head-only count queries - cheap enough to refire on every realtime event.
// Accepts either the server or the browser Supabase client.
export async function fetchShellCounts(
  supabase: SupabaseClient,
): Promise<ShellCounts> {
  const nowIso = new Date().toISOString();
  const [tasks, awaiting, quarantine] = await Promise.all([
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .or(inboxFilter(nowIso)),
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("state", "awaiting_meg"),
    supabase
      .from("quarantined_messages")
      .select("*", { count: "exact", head: true })
      .is("claimed_client_id", null),
  ]);
  return {
    pendingTriage: tasks.count ?? 0,
    awaitingMeg: awaiting.count ?? 0,
    quarantined: quarantine.count ?? 0,
  };
}
