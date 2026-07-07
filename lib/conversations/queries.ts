import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

import { threadTitle } from "./format";
import {
  hasFailedOutbound,
  isUnread,
  lastMessageByConversation,
  sortThreads,
  type LiteMessage,
} from "./derive";

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
  failedSend: boolean;
};

export type PendingTask = {
  id: string;
  status: string | null;
  draft_message: string | null;
  meg_edited_message: string | null;
  request_summary: string | null;
  request_type: string | null;
  draft_channel: string | null;
  created_at: string | null;
};

export type SiblingThread = { id: string; state: string; title: string };

export type ThreadData = {
  conversation: ConversationJoined;
  messages: MessageRow[];
  pendingTask: PendingTask | null;
  siblings: SiblingThread[];
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
      // lastMessage null, unread false, failedSend false.
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
    unread: isUnread(messages, conversation.id, conversation.last_read_at),
    failedSend: hasFailedOutbound(messages, conversation.id),
  }));

  return sortThreads(items);
}

type SiblingQueryRow = {
  id: string;
  state: string;
  channel_row:
    | { family_member: { first_name: string } | { first_name: string }[] | null }
    | { family_member: { first_name: string } | { first_name: string }[] | null }[]
    | null;
};

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getThread(id: string): Promise<ThreadData | null> {
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("conversations").select(CONVERSATION_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load conversation: ${error.message}`);
  if (!conversation) return null;
  const conv = conversation as ConversationJoined;

  const [{ data: messages, error: msgError }, { data: taskRows, error: taskError }, { data: sibRows, error: sibError }] =
    await Promise.all([
      supabase.from("messages").select("*").eq("conversation_id", id)
        .order("created_at", { ascending: true }),
      // The agent's queued reply for this conversation, if any. Includes
      // elapsed-snoozed tasks: they are back in the inbox in spirit.
      supabase.from("tasks")
        .select("id,status,draft_message,meg_edited_message,request_summary,request_type,draft_channel,created_at")
        .eq("conversation_id", id)
        .in("status", ["pending", "snoozed"])
        .order("created_at", { ascending: false })
        .limit(1),
      // Other threads in the same household, for the sibling chips.
      supabase.from("conversations")
        .select("id,state,channel_row:client_channels(family_member:family_members(first_name))")
        .eq("client_id", conv.client_id)
        .neq("id", id),
    ]);
  if (msgError) throw new Error(`Failed to load messages: ${msgError.message}`);
  if (taskError) throw new Error(`Failed to load pending task: ${taskError.message}`);
  if (sibError) throw new Error(`Failed to load household threads: ${sibError.message}`);

  const siblings: SiblingThread[] = ((sibRows ?? []) as SiblingQueryRow[]).map((s) => {
    const channelRow = firstOrSelf(s.channel_row);
    const familyMember = firstOrSelf(channelRow?.family_member);
    return {
      id: s.id,
      state: s.state,
      title: conv.client ? threadTitle(conv.client, familyMember) : "Unknown",
    };
  });

  return {
    conversation: conv,
    messages: messages ?? [],
    pendingTask: ((taskRows ?? [])[0] as PendingTask | undefined) ?? null,
    siblings,
  };
}

export async function getQuarantined(): Promise<QuarantinedRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quarantined_messages").select("*")
    .is("claimed_client_id", null)
    .order("received_at", { ascending: false });
  if (error) throw new Error(`Failed to load quarantine: ${error.message}`);
  return data ?? [];
}
