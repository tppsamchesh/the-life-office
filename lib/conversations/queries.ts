import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

import { threadTitle } from "./format";
import { isUnread, lastMessageByConversation, type LiteMessage } from "./derive";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type QuarantinedRow = Database["public"]["Tables"]["quarantined_messages"]["Row"];

type ConversationJoined = ConversationRow & {
  client: { first_name: string; last_name: string | null } | null;
  channel_row:
    | { id: string; address: string; channel: string;
        family_member: { first_name: string } | null }
    | null;
};

export type ThreadListItem = {
  conversation: ConversationJoined;
  title: string;
  channel: string;
  address: string | null;
  lastMessage: LiteMessage | null;
  unread: boolean;
};

const CONVERSATION_SELECT =
  "*, client:clients(first_name,last_name), channel_row:client_channels(id,address,channel,family_member:family_members(first_name))";

export async function getThreads(): Promise<ThreadListItem[]> {
  const supabase = await createClient();
  const [{ data: convs, error: convError }, { data: msgs, error: msgError }] =
    await Promise.all([
      supabase.from("conversations").select(CONVERSATION_SELECT)
        .order("updated_at", { ascending: false }),
      // Global window across all threads: newest 2000 messages. At <25 clients this
      // covers months of traffic. If one thread could ever crowd out the rest, move
      // to a per-conversation lateral join; a thread outside the window degrades to
      // lastMessage null and unread false.
      supabase.from("messages")
        .select("conversation_id,direction,author,body,created_at,status")
        .order("created_at", { ascending: false }).limit(2000),
    ]);
  if (convError) throw new Error(`Failed to load conversations: ${convError.message}`);
  if (msgError) throw new Error(`Failed to load messages: ${msgError.message}`);

  const messages = (msgs ?? []) as LiteMessage[];
  const lastByConv = lastMessageByConversation(messages);

  const items = ((convs ?? []) as ConversationJoined[]).map((conversation) => ({
    conversation,
    title: conversation.client
      ? threadTitle(conversation.client, conversation.channel_row?.family_member ?? null)
      : "Unknown",
    channel: conversation.channel,
    address: conversation.channel_row?.address ?? null,
    lastMessage: lastByConv.get(conversation.id) ?? null,
    unread: isUnread(messages, conversation.id),
  }));

  items.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    const aT = a.lastMessage?.created_at ?? a.conversation.updated_at;
    const bT = b.lastMessage?.created_at ?? b.conversation.updated_at;
    return aT < bT ? 1 : -1;
  });
  return items;
}

export async function getThread(id: string): Promise<
  { conversation: ConversationJoined; messages: MessageRow[] } | null
> {
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("conversations").select(CONVERSATION_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load conversation: ${error.message}`);
  if (!conversation) return null;
  const { data: messages, error: msgError } = await supabase
    .from("messages").select("*").eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (msgError) throw new Error(`Failed to load messages: ${msgError.message}`);
  return { conversation: conversation as ConversationJoined, messages: messages ?? [] };
}

export async function getQuarantined(): Promise<QuarantinedRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quarantined_messages").select("*")
    .order("received_at", { ascending: false });
  if (error) throw new Error(`Failed to load quarantine: ${error.message}`);
  return data ?? [];
}
