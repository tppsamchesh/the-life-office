import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export type InboxTask = TaskRow & {
  client: { first_name: string; last_name: string } | null;
  family_member: { first_name: string; last_name: string | null; type: string } | null;
};

// Pending tasks, plus snoozed tasks whose snooze has elapsed. Urgent first, then newest.
export async function getInboxTasks(): Promise<InboxTask[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, client:clients(first_name,last_name), family_member:family_members(first_name,last_name,type)",
    )
    .or(`status.eq.pending,and(status.eq.snoozed,snoozed_until.lte.${nowIso})`)
    .order("urgency", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load inbox: ${error.message}`);
  return (data ?? []) as InboxTask[];
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
