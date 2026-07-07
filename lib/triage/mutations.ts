import { createClient } from "@/lib/supabase/server";

type ActivityType = "task_approved" | "task_dismissed" | "task_snoozed";

export type TaskTransition = {
  id: string;
  // The statuses the task must currently be in for the update to apply.
  // Inbox tasks are 'pending' or 'snoozed' (an elapsed snooze re-enters the
  // inbox without changing status), so callers pass ["pending", "snoozed"].
  expectStatuses: string[];
  patch: Record<string, unknown>;
  activity?: { type: ActivityType; description: string };
};

// Conditionally transitions a task. Zero rows matched means someone (Meg in
// another tab, or a future daemon consumer) changed it first; we surface that
// instead of clobbering.
export async function transitionTask(t: TaskTransition): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(t.patch)
    .eq("id", t.id)
    .in("status", t.expectStatuses)
    .select("id, client_id, family_member_id");

  if (error) return { error: `Failed to update task: ${error.message}` };
  if (!data || data.length === 0) {
    return { error: "This task changed while you were looking. Refresh to see its current state." };
  }

  if (t.activity) {
    await supabase.from("activity_log").insert({
      task_id: t.id,
      client_id: data[0].client_id,
      family_member_id: data[0].family_member_id,
      activity_type: t.activity.type,
      description: t.activity.description,
    });
  }
  return {};
}
