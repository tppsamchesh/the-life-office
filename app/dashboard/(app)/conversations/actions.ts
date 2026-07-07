"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { onHandBack, onMegSend, takeOver } from "@/lib/conversations/state";
import { validateReplyBody } from "@/lib/conversations/validate";

// Feedback contract: actions that can fail return { error } instead of
// throwing, so useActionState forms can render it inline and preserve drafts.
export type ConversationActionState = { error?: string; body?: string };

// Returns an error message, or null on success.
async function applyTransition(
  conversationId: string,
  next: ReturnType<typeof onMegSend>,
): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) return `Failed to update conversation: ${error.message}`;
  revalidatePath("/dashboard/conversations");
  return null;
}

export async function sendReply(
  _prev: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const conversationId = String(formData.get("conversationId"));
  const validated = validateReplyBody(formData.get("body"));
  if ("error" in validated) return { error: validated.error };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    author: "meg",
    body: validated.body,
    status: "queued",
  });
  if (error) {
    return { error: `Failed to queue reply: ${error.message}`, body: validated.body };
  }

  const transitionError = await applyTransition(conversationId, onMegSend());
  if (transitionError) return { error: transitionError };
  return {};
}

export async function takeOverConversation(
  _prev: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const error = await applyTransition(String(formData.get("conversationId")), takeOver());
  return error ? { error } : {};
}

export async function handBackConversation(
  _prev: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const error = await applyTransition(String(formData.get("conversationId")), onHandBack());
  return error ? { error } : {};
}
