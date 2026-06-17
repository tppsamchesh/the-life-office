import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type FamilyMemberRow = Database["public"]["Tables"]["family_members"]["Row"];
type LifecycleRow = Database["public"]["Tables"]["lifecycle_dates"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activity_log"]["Row"];

export type ClientSummary = ClientRow & { memberCount: number; openTaskCount: number };

export function householdName(client: Pick<ClientRow, "first_name" | "last_name">): string {
  return `The ${client.last_name} Household`;
}

export async function getClients(): Promise<ClientSummary[]> {
  const supabase = await createClient();
  const [clientsRes, membersRes, pendingRes] = await Promise.all([
    supabase.from("clients").select("*").order("last_name"),
    supabase.from("family_members").select("client_id"),
    supabase.from("tasks").select("client_id").eq("status", "pending"),
  ]);

  if (clientsRes.error) throw new Error(`Failed to load clients: ${clientsRes.error.message}`);

  const memberCounts = new Map<string, number>();
  for (const m of membersRes.data ?? []) {
    if (m.client_id) memberCounts.set(m.client_id, (memberCounts.get(m.client_id) ?? 0) + 1);
  }
  const taskCounts = new Map<string, number>();
  for (const t of pendingRes.data ?? []) {
    if (t.client_id) taskCounts.set(t.client_id, (taskCounts.get(t.client_id) ?? 0) + 1);
  }

  return (clientsRes.data ?? []).map((c) => ({
    ...c,
    memberCount: memberCounts.get(c.id) ?? 0,
    openTaskCount: taskCounts.get(c.id) ?? 0,
  }));
}

export type ClientDetail = {
  client: ClientRow;
  members: FamilyMemberRow[];
  lifecycle: LifecycleRow[];
  openTasks: TaskRow[];
  activity: ActivityRow[];
};

export async function getClient(id: string): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const [clientRes, membersRes, datesRes, tasksRes, activityRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("family_members").select("*").eq("client_id", id).order("type"),
    supabase.from("lifecycle_dates").select("*").eq("client_id", id),
    supabase.from("tasks").select("*").eq("client_id", id).eq("status", "pending"),
    supabase
      .from("activity_log")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (!clientRes.data) return null;

  return {
    client: clientRes.data,
    members: membersRes.data ?? [],
    lifecycle: datesRes.data ?? [],
    openTasks: tasksRes.data ?? [],
    activity: activityRes.data ?? [],
  };
}

export type FamilyMemberDetail = {
  client: Pick<ClientRow, "id" | "first_name" | "last_name">;
  member: FamilyMemberRow;
  lifecycle: LifecycleRow[];
  tasks: TaskRow[];
  activity: ActivityRow[];
};

export async function getFamilyMember(
  clientId: string,
  memberId: string,
): Promise<FamilyMemberDetail | null> {
  const supabase = await createClient();
  const memberRes = await supabase
    .from("family_members")
    .select("*")
    .eq("id", memberId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!memberRes.data) return null;

  const [clientRes, datesRes, tasksRes, activityRes] = await Promise.all([
    supabase.from("clients").select("id, first_name, last_name").eq("id", clientId).maybeSingle(),
    supabase.from("lifecycle_dates").select("*").eq("family_member_id", memberId),
    supabase.from("tasks").select("*").eq("family_member_id", memberId).eq("status", "pending"),
    supabase
      .from("activity_log")
      .select("*")
      .eq("family_member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (!clientRes.data) return null;

  return {
    client: clientRes.data,
    member: memberRes.data,
    lifecycle: datesRes.data ?? [],
    tasks: tasksRes.data ?? [],
    activity: activityRes.data ?? [],
  };
}
