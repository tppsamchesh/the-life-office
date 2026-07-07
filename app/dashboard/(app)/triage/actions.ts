"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { transitionTask } from "@/lib/triage/mutations";

export type TaskActionState = { error?: string };

// Inbox tasks are 'pending' or 'snoozed' (an elapsed snooze re-enters the
// inbox without changing status), so every inbox mutation expects one of these.
const INBOX_STATUSES = ["pending", "snoozed"];

// Where to land after a successful decision: the next task in the list (the
// page computes it), not bare /dashboard/triage, so Meg keeps her place.
function successUrl(formData: FormData): string {
  const next = String(formData.get("nextTaskId") ?? "");
  return next ? `/dashboard/triage?task=${next}` : "/dashboard/triage";
}

function revalidateBoth(): void {
  revalidatePath("/dashboard/triage");
  revalidatePath("/dashboard/conversations");
}

export async function approveTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const result = await transitionTask({
    id: String(formData.get("taskId") ?? ""),
    expectStatuses: INBOX_STATUSES,
    patch: { status: "approved", approved_at: new Date().toISOString() },
    activity: { type: "task_approved", description: "Approved the agent's draft reply" },
  });
  if (result.error) return result;
  revalidateBoth();
  redirect(successUrl(formData));
}

export async function editApproveTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "The edited reply is empty." };
  const result = await transitionTask({
    id: String(formData.get("taskId") ?? ""),
    expectStatuses: INBOX_STATUSES,
    patch: {
      status: "approved",
      approved_at: new Date().toISOString(),
      meg_edited_message: message,
    },
    activity: { type: "task_approved", description: "Edited and approved the reply" },
  });
  if (result.error) return result;
  revalidateBoth();
  redirect(successUrl(formData));
}

export async function dismissTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const reason = String(formData.get("reason") ?? "");
  const result = await transitionTask({
    id: String(formData.get("taskId") ?? ""),
    expectStatuses: INBOX_STATUSES,
    patch: { status: "dismissed", dismissed_reason: reason },
    activity: {
      type: "task_dismissed",
      description: reason ? `Dismissed: ${reason}` : "Dismissed",
    },
  });
  if (result.error) return result;
  revalidateBoth();
  redirect(successUrl(formData));
}

export async function snoozeTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const until = String(formData.get("until") ?? "");
  const untilDate = new Date(until);
  if (!until || Number.isNaN(untilDate.getTime())) {
    return { error: "Pick a snooze time first." };
  }
  const wakeLabel = untilDate.toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
  });
  const result = await transitionTask({
    id: String(formData.get("taskId") ?? ""),
    expectStatuses: INBOX_STATUSES,
    patch: { status: "snoozed", snoozed_until: untilDate.toISOString() },
    activity: { type: "task_snoozed", description: `Snoozed until ${wakeLabel}` },
  });
  if (result.error) return result;
  revalidatePath("/dashboard/triage");
  redirect(successUrl(formData));
}

// Note has no matching activity_log type; update meg_notes only and stay on
// the same task.
export async function noteTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const id = String(formData.get("taskId") ?? "");
  const result = await transitionTask({
    id,
    expectStatuses: INBOX_STATUSES,
    patch: { meg_notes: String(formData.get("note") ?? "") },
  });
  if (result.error) return result;
  revalidatePath("/dashboard/triage");
  redirect(`/dashboard/triage?task=${id}`);
}

// Brings a snoozed task back into the inbox immediately.
export async function wakeTask(
  _prev: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const id = String(formData.get("taskId") ?? "");
  const result = await transitionTask({
    id,
    expectStatuses: ["snoozed"],
    patch: { status: "pending", snoozed_until: null },
  });
  if (result.error) return result;
  revalidatePath("/dashboard/triage");
  redirect(`/dashboard/triage?task=${id}`);
}
