"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type ActivityType = "task_approved" | "task_dismissed" | "task_snoozed";

// Updates the task and (optionally) logs an activity entry for it.
async function updateTask(
  id: string,
  patch: Record<string, unknown>,
  activity?: { type: ActivityType; description: string },
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("client_id, family_member_id")
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);

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
}

export async function approveTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  await updateTask(
    id,
    { status: "approved", approved_at: new Date().toISOString() },
    { type: "task_approved", description: "Approved the agent's draft reply" },
  );
  redirect("/dashboard/triage");
}

export async function editApproveTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  const message = String(formData.get("message") ?? "");
  await updateTask(
    id,
    {
      status: "approved",
      approved_at: new Date().toISOString(),
      meg_edited_message: message,
    },
    { type: "task_approved", description: "Edited and approved the reply" },
  );
  redirect("/dashboard/triage");
}

export async function dismissTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  const reason = String(formData.get("reason") ?? "");
  await updateTask(
    id,
    { status: "dismissed", dismissed_reason: reason },
    { type: "task_dismissed", description: reason ? `Dismissed: ${reason}` : "Dismissed" },
  );
  redirect("/dashboard/triage");
}

export async function snoozeTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  const until = String(formData.get("until") ?? "");
  await updateTask(
    id,
    { status: "snoozed", snoozed_until: new Date(until).toISOString() },
    { type: "task_snoozed", description: `Snoozed until ${until}` },
  );
  redirect("/dashboard/triage");
}

// Note has no matching activity_log type — update meg_notes only.
export async function noteTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  const note = String(formData.get("note") ?? "");
  await updateTask(id, { meg_notes: note });
  redirect("/dashboard/triage");
}
