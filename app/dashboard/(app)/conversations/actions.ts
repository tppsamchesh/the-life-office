"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { onHandBack, onMegSend, takeOver } from "@/lib/conversations/state";

async function applyTransition(conversationId: string, next: ReturnType<typeof onMegSend>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw new Error(`Failed to update conversation: ${error.message}`);
  revalidatePath("/dashboard/conversations");
}

export async function sendReply(formData: FormData) {
  const conversationId = String(formData.get("conversationId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    author: "meg",
    body,
    status: "queued",
  });
  if (error) throw new Error(`Failed to queue reply: ${error.message}`);
  await applyTransition(conversationId, onMegSend());
}

export async function takeOverConversation(formData: FormData) {
  await applyTransition(String(formData.get("conversationId")), takeOver());
}

export async function handBackConversation(formData: FormData) {
  await applyTransition(String(formData.get("conversationId")), onHandBack());
}
