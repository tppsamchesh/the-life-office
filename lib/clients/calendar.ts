import { createClient } from "@/lib/supabase/server";

import { buildDateEntries, type DateEntry } from "./dates";

export async function getCalendarEntries(from: Date = new Date()): Promise<DateEntry[]> {
  const supabase = await createClient();
  const [clientsRes, lifecycleRes, membersRes] = await Promise.all([
    supabase.from("clients").select("id, last_name"),
    supabase.from("lifecycle_dates").select("id, item, date, category, client_id, family_member_id"),
    supabase.from("family_members").select("id, first_name, date_of_birth, client_id"),
  ]);

  if (clientsRes.error) throw new Error(`Failed to load calendar: ${clientsRes.error.message}`);

  const nameByClient = new Map<string, string>();
  for (const c of clientsRes.data ?? []) {
    nameByClient.set(c.id, `The ${c.last_name} Household`);
  }

  const lifecycle = lifecycleRes.data ?? [];
  const members = membersRes.data ?? [];
  const entries: DateEntry[] = [];

  for (const [clientId, name] of nameByClient) {
    const clientLifecycle = lifecycle.filter((l) => l.client_id === clientId);
    const clientMembers = members.filter((m) => m.client_id === clientId);
    entries.push(...buildDateEntries(clientLifecycle, clientMembers, name, from));
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}
