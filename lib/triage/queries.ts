import { deliveryForApproved, type DeliveryState } from "@/lib/triage/approved";
import type { LiteMessage } from "@/lib/conversations/derive";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export type InboxTask = TaskRow & {
  client: { first_name: string; last_name: string } | null;
  family_member: { first_name: string; last_name: string | null; type: string } | null;
};

const TASK_SELECT =
  "*, client:clients(first_name,last_name), family_member:family_members(first_name,last_name,type)";

// Pending tasks, plus snoozed tasks whose snooze has elapsed. Urgent first
// (nullsFirst: false keeps untagged tasks below tagged ones; PostgREST puts
// NULLs first on DESC by default), then newest.
export async function getInboxTasks(): Promise<InboxTask[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .or(`status.eq.pending,and(status.eq.snoozed,snoozed_until.lte.${nowIso})`)
    .order("urgency", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load inbox: ${error.message}`);
  return (data ?? []) as InboxTask[];
}

// Tasks still asleep, soonest wake first. Shown in the "Snoozed (N)" section.
export async function getSnoozedTasks(): Promise<InboxTask[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("status", "snoozed")
    .gt("snoozed_until", nowIso)
    .order("snoozed_until", { ascending: true });

  if (error) throw new Error(`Failed to load snoozed tasks: ${error.message}`);
  return (data ?? []) as InboxTask[];
}

export type ApprovedTaskItem = { task: InboxTask; delivery: DeliveryState };

// Tasks approved in the last 24h, newest first, each with what actually
// happened to the reply (derived from outbound messages in the conversation).
export async function getRecentlyApproved(): Promise<ApprovedTaskItem[]> {
  const supabase = await createClient();
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("status", "approved")
    .gte("approved_at", sinceIso)
    .order("approved_at", { ascending: false });

  if (error) throw new Error(`Failed to load approved tasks: ${error.message}`);
  const tasks = (data ?? []) as InboxTask[];

  const convIds = [...new Set(tasks.map((t) => t.conversation_id).filter((v): v is string => Boolean(v)))];
  let messages: LiteMessage[] = [];
  if (convIds.length > 0) {
    const { data: msgs, error: msgError } = await supabase
      .from("messages")
      .select("conversation_id,direction,author,body,created_at,status")
      .in("conversation_id", convIds)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(500);
    if (msgError) throw new Error(`Failed to load outbound messages: ${msgError.message}`);
    messages = (msgs ?? []) as LiteMessage[];
  }

  return tasks.map((task) => ({
    task,
    delivery: deliveryForApproved(messages, task.conversation_id, task.approved_at),
  }));
}

// Display name for a task: the specific family member if linked, else the household.
export function taskTitle(task: InboxTask): string {
  if (task.family_member) {
    return [task.family_member.first_name, task.family_member.last_name]
      .filter(Boolean)
      .join(" ");
  }
  if (task.client) return `${task.client.first_name} ${task.client.last_name}`;
  return "Unknown";
}
