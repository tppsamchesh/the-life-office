"use server";

import { revalidatePath } from "next/cache";

import { onHandBack, onMegSend, takeOver } from "@/lib/conversations/state";
import { createClient } from "@/lib/supabase/server";
import { transitionTask } from "@/lib/triage/mutations";

export type ActionState = { error?: string };
export type ReplyState = { error?: string; body?: string };

const STALE_CONVERSATION =
  "This conversation changed while you were looking. Refresh to see its current state.";

// Applies a state transition only when the conversation's pause flag matches
// what Meg was looking at, so two tabs (or Meg and the daemon) racing each
// other cannot silently clobber state. expectPaused null = unconditional
// (used by sendReply, where meg_active is safe from any starting state).
async function applyTransition(
  conversationId: string,
  next: ReturnType<typeof onMegSend>,
  expectPaused: boolean | null,
): Promise<ActionState> {
  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (expectPaused !== null) query = query.eq("agent_paused", expectPaused);
  const { data, error } = await query.select("id");
  if (error) return { error: `Failed to update conversation: ${error.message}` };
  if (!data || data.length === 0) return { error: STALE_CONVERSATION };
  revalidatePath("/dashboard/conversations");
  return {};
}

// Once Meg answers herself, any open agent task for this conversation is
// stale: one habitual Approve would fire a duplicate reply at a client.
// Dismiss it (conditionally) and journal the auto-resolution.
async function resolveOpenTasks(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .update({ status: "dismissed", dismissed_reason: "Meg replied in the thread directly" })
    .eq("conversation_id", conversationId)
    .in("status", ["pending", "snoozed"])
    .select("id, client_id, family_member_id");
  if (data && data.length > 0) {
    await supabase.from("activity_log").insert(
      data.map((t) => ({
        task_id: t.id,
        client_id: t.client_id,
        family_member_id: t.family_member_id,
        activity_type: "task_dismissed",
        description: "Auto-resolved: Meg replied in the thread directly",
      })),
    );
    revalidatePath("/dashboard/triage");
  }
}

export async function sendReply(_prev: ReplyState, formData: FormData): Promise<ReplyState> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const intent = String(formData.get("intent") ?? "send");
  if (!conversationId) return { error: "Missing conversation." };
  if (!body) return { error: "Type a reply first." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    author: "meg",
    body,
    status: "queued",
  });
  if (error) return { error: `Could not queue your reply: ${error.message}`, body };

  await resolveOpenTasks(conversationId);

  // Plain send pauses the assistant (meg_active); "Send & hand back" answers
  // and immediately returns the thread to the assistant (idle, unpaused).
  const next = intent === "send_hand_back" ? onHandBack() : onMegSend();
  const result = await applyTransition(conversationId, next, null);
  if (result.error) return { error: result.error, body };
  return {};
}

export async function takeOverConversation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return applyTransition(String(formData.get("conversationId") ?? ""), takeOver(), false);
}

export async function handBackConversation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return applyTransition(String(formData.get("conversationId") ?? ""), onHandBack(), true);
}

// Called directly (not via a form) by MarkRead when Meg opens an unread
// thread. Unconditional: it only moves a dashboard-owned timestamp forward.
export async function markConversationRead(conversationId: string): Promise<void> {
  if (!conversationId) return;
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", conversationId);
  revalidatePath("/dashboard/conversations");
}

// Re-queues a terminally failed outbound message. The daemon's sender treats
// status='queued' with next_attempt_at null as due on its next poll
// (agent/concierge/concierge/db.py fetch_due_outbound), so resetting these
// four fields is the complete retry contract.
export async function retryMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const messageId = String(formData.get("messageId") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ status: "queued", error: null, send_attempts: 0, next_attempt_at: null })
    .eq("id", messageId)
    .eq("status", "failed")
    .select("id");
  if (error) return { error: `Retry failed: ${error.message}` };
  if (!data || data.length === 0) {
    return { error: "This message changed while you were looking. Refresh to see its current state." };
  }
  revalidatePath("/dashboard/conversations");
  return {};
}

function revalidateBoth(): void {
  revalidatePath("/dashboard/conversations");
  revalidatePath("/dashboard/triage");
}

export async function approveTaskFromThread(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await transitionTask({
    id: String(formData.get("taskId") ?? ""),
    expectStatuses: ["pending", "snoozed"],
    patch: { status: "approved", approved_at: new Date().toISOString() },
    activity: { type: "task_approved", description: "Approved the agent's draft reply from the thread" },
  });
  if (result.error) return result;
  revalidateBoth();
  return {};
}

export async function editApproveTaskFromThread(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "The edited draft is empty." };
  const result = await transitionTask({
    id: String(formData.get("taskId") ?? ""),
    expectStatuses: ["pending", "snoozed"],
    patch: {
      status: "approved",
      approved_at: new Date().toISOString(),
      meg_edited_message: message,
    },
    activity: { type: "task_approved", description: "Edited and approved the reply from the thread" },
  });
  if (result.error) return result;
  revalidateBoth();
  return {};
}

export async function cancelTaskFromThread(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await transitionTask({
    id: String(formData.get("taskId") ?? ""),
    expectStatuses: ["pending", "snoozed"],
    patch: { status: "dismissed", dismissed_reason: "Cancelled from the thread" },
    activity: { type: "task_dismissed", description: "Cancelled the assistant's draft from the thread" },
  });
  if (result.error) return result;
  revalidateBoth();
  return {};
}
