import Link from "next/link";

import type { Database } from "@/lib/supabase/types";

import { handBackConversation, sendReply, takeOverConversation } from "../actions";
import { GraceChip } from "./GraceChip";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const STATUS_LABEL: Record<string, string> = {
  queued: "queued", sending: "sending", sent: "sent",
  delivered: "delivered", failed: "failed", cancelled: "cancelled",
};

function Bubble({ message }: { message: MessageRow }) {
  const inbound = message.direction === "inbound";
  const fromAgent = message.author === "agent";
  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
          inbound
            ? "bg-white border border-[#E7E2D9]"
            : fromAgent
              ? "bg-[#DFE5DA] border border-[#C9D2C2]"
              : "bg-[#A8B2A1] text-white"
        }`}
      >
        {fromAgent ? (
          <div className="mb-0.5 text-[10px] uppercase tracking-wide text-[#5F6B58]">
            assistant · sent as Meg
          </div>
        ) : null}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <div className={`mt-1 text-[10px] ${inbound ? "text-[#A39E94]" : fromAgent ? "text-[#5F6B58]" : "text-white/70"}`}>
          {new Date(message.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          {!inbound && STATUS_LABEL[message.status] ? ` · ${STATUS_LABEL[message.status]}` : ""}
        </div>
      </div>
    </div>
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
    <div className="flex h-full flex-col rounded-xl border border-[#E4DFD6] bg-[#FAF8F4]">
      <div className="flex items-center justify-between gap-3 border-b border-[#E7E2D9] px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-lg">{title}</h2>
          <GraceChip deadline={conversation.state === "awaiting_meg" ? conversation.grace_deadline : null} />
          {conversation.state === "agent_active" ? (
            <span className="rounded-full bg-[#DFE5DA] px-2 py-0.5 text-[11px] font-medium text-[#5F6B58]">
              agent active
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/conversations?conversation=${conversation.id}&view=${view === "summary" ? "transcript" : "summary"}`}
            className="text-xs text-[#6B665D] underline hover:text-[#1F1F1F]"
          >
            {view === "summary" ? "Show transcript" : "Show summary"}
          </Link>
          <form action={paused ? handBackConversation : takeOverConversation}>
            <input type="hidden" name="conversationId" value={conversation.id} />
            <button
              type="submit"
              className="rounded-md border border-[#D8D2C8] bg-white px-3 py-1.5 text-xs hover:bg-[#EFEBE4]"
            >
              {paused ? "Hand back to assistant" : "I've got this"}
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {view === "summary" ? (
          <p className="text-sm text-[#6B665D]">
            {conversation.rolling_summary ?? "No summary yet."}
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#8A857B]">No messages yet.</p>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
      </div>

      <form action={sendReply} className="flex gap-2 border-t border-[#E7E2D9] px-4 py-3">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <textarea
          name="body"
          rows={2}
          required
          placeholder="Reply as Meg..."
          className="flex-1 resize-none rounded-lg border border-[#D8D2C8] bg-white px-3 py-2 text-sm outline-none focus:border-[#A8B2A1]"
        />
        <button
          type="submit"
          className="self-end rounded-lg bg-[#A8B2A1] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Send
        </button>
      </form>
    </div>
  );
}
