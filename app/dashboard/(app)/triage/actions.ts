"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { parseSnoozeUntil } from "@/lib/triage/validate";

// Feedback contract: actions that can fail return { error } (plus the typed
// value so the form can restore the draft) instead of throwing.
export type TaskActionState = { error?: string; value?: string };

type ActivityType = "task_approved" | "task_dismissed" | "task_snoozed";

// Updates the task and (optionally) logs an activity entry for it.
// Returns an error message, or null on success.
async function updateTask(
  id: string,
  patch: Record<string, unknown>,
  activity?: { type: ActivityType; description: string },
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("client_id, family_member_id")
    .single();

  if (error) return `Failed to update task: ${error.message}`;

  if (activity) {
    await supabase.from("activity_log").insert({
      task_id: id,
      client_id: data.client_id,
      family_member_id: data.family_member_id,
      activity_type: activity.type,
      description: activity.description,
    });
  }

  revalidatePath("/dashboard/triage");
  return null;
}

export async function approveTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const id = String(formData.get("taskId"));
  const error = await updateTask(
    id,
    { status: "approved", approved_at: new Date().toISOString() },
    { type: "task_approved", description: "Approved the agent's draft reply" },
  );
  if (error) return { error };
  redirect("/dashboard/triage");
}

export async function editApproveTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const id = String(formData.get("taskId"));
  const message = String(formData.get("message") ?? "");
  if (!message.trim()) return { error: "The reply can't be empty.", value: message };
  const error = await updateTask(
    id,
    {
      status: "approved",
      approved_at: new Date().toISOString(),
      meg_edited_message: message,
    },
    { type: "task_approved", description: "Edited and approved the reply" },
  );
  if (error) return { error, value: message };
  redirect("/dashboard/triage");
}

export async function dismissTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const id = String(formData.get("taskId"));
  const reason = String(formData.get("reason") ?? "");
  const error = await updateTask(
    id,
    { status: "dismissed", dismissed_reason: reason },
    { type: "task_dismissed", description: reason ? `Dismissed: ${reason}` : "Dismissed" },
  );
  if (error) return { error, value: reason };
  redirect("/dashboard/triage");
}

export async function snoozeTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const id = String(formData.get("taskId"));
  const raw = String(formData.get("until") ?? "");
  const parsed = parseSnoozeUntil(raw);
  if ("error" in parsed) return { error: parsed.error, value: raw };
  const error = await updateTask(
    id,
    { status: "snoozed", snoozed_until: parsed.until },
    { type: "task_snoozed", description: `Snoozed until ${raw}` },
  );
  if (error) return { error, value: raw };
  redirect("/dashboard/triage");
}

// Note has no matching activity_log type — update meg_notes only.
export async function noteTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const id = String(formData.get("taskId"));
  const note = String(formData.get("note") ?? "");
  const error = await updateTask(id, { meg_notes: note });
  if (error) return { error, value: note };
  redirect("/dashboard/triage");
}
