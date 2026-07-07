"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { Database } from "@/lib/supabase/types";

import { Button, Chip, FormError, Textarea } from "../../_components/ui";
import {
  handBackConversation,
  sendReply,
  takeOverConversation,
  type ConversationActionState,
} from "../actions";
import { GraceChip } from "./GraceChip";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const STATUS_LABEL: Record<string, string> = {
  queued: "queued", sending: "sending", sent: "sent",
  delivered: "delivered", failed: "failed", cancelled: "cancelled",
};

const INITIAL: ConversationActionState = {};

function Bubble({ message }: { message: MessageRow }) {
  const inbound = message.direction === "inbound";
  const fromAgent = message.author === "agent";
  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
          inbound
            ? "bg-surface border border-hairline"
            : fromAgent
              ? "bg-sage-tint border border-sage-deep/20"
              : "bg-sage text-white"
        }`}
      >
        {fromAgent ? (
          <div className="mb-0.5 text-[11px] uppercase tracking-wide text-sage-deep">
            assistant · sent as Meg
          </div>
        ) : null}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <div className={`mt-1 text-[11px] ${inbound ? "text-muted" : fromAgent ? "text-sage-deep" : "text-white/70"}`}>
          {new Date(message.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          {!inbound && STATUS_LABEL[message.status] ? ` · ${STATUS_LABEL[message.status]}` : ""}
        </div>
      </div>
    </div>
  );
}

// Take-over / hand-back control. Keyed by mode at the call site so
// useActionState resets when the conversation flips.
function ControlForm({ conversationId, paused }: { conversationId: string; paused: boolean }) {
  const [state, formAction] = useActionState(
    paused ? handBackConversation : takeOverConversation,
    INITIAL,
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <FormError message={state.error} />
      <Button type="submit" variant="secondary" pendingLabel="Saving…">
        {paused ? "Hand back to assistant" : "I've got this"}
      </Button>
    </form>
  );
}

// Reply composer. On failure the action returns { error, body } and the
// textarea's defaultValue restores the draft; on success state is {} and
// the field clears.
function Composer({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(sendReply, INITIAL);
  return (
    <form action={formAction} className="border-t border-hairline px-4 py-3">
      <div className="flex gap-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <Textarea
          name="body"
          rows={2}
          required
          placeholder="Reply as Meg..."
          aria-label="Reply as Meg"
          defaultValue={state.body ?? ""}
          className="flex-1 resize-none"
        />
        <Button type="submit" variant="primary" pendingLabel="Sending…" className="self-end">
          Send
        </Button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}

export function ThreadView({
  conversation, messages, title, view,
}: {
  conversation: { id: string; state: string; agent_paused: boolean;
    grace_deadline: string | null; rolling_summary: string | null };
  messages: MessageRow[];
  title: string;
  view: "transcript" | "summary";
}) {
  const paused = conversation.agent_paused;
  return (
    <div className="flex h-full flex-col rounded-xl border border-hairline bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-lg">{title}</h2>
          <GraceChip deadline={conversation.state === "awaiting_meg" ? conversation.grace_deadline : null} />
          {conversation.state === "agent_active" ? <Chip tone="sage">agent active</Chip> : null}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/conversations?conversation=${conversation.id}&view=${view === "summary" ? "transcript" : "summary"}`}
            className="text-xs text-muted underline hover:text-ink"
          >
            {view === "summary" ? "Show transcript" : "Show summary"}
          </Link>
          <ControlForm
            key={paused ? "handback" : "takeover"}
            conversationId={conversation.id}
            paused={paused}
          />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {view === "summary" ? (
          <p className="text-sm text-muted">
            {conversation.rolling_summary ?? "No summary yet."}
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted">No messages yet.</p>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
      </div>

      <Composer conversationId={conversation.id} />
    </div>
  );
}
