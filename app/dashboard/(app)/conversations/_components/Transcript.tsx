"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { dayDividerLabel, londonDayKey, londonTime } from "@/lib/conversations/format";
import type { Database } from "@/lib/supabase/types";

import { retryMessage, type ActionState } from "../actions";

import { Button } from "../../_components/ui";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

// Failed gets its own footer below the bubble instead of a status suffix.
const STATUS_LABEL: Record<string, string> = {
  queued: "queued", sending: "sending", sent: "sent",
  delivered: "delivered", cancelled: "cancelled",
};

function FailedFooter({ message }: { message: MessageRow }) {
  const [state, formAction] = useActionState(retryMessage, {} as ActionState);
  return (
    <div className="mt-1 flex max-w-[75%] flex-wrap items-center justify-end gap-2">
      <span className="text-xs font-medium text-alert">
        Failed to send{message.error ? ` · ${message.error}` : ""}
      </span>
      <form action={formAction}>
        <input type="hidden" name="messageId" value={message.id} />
        <Button type="submit" variant="danger" pendingLabel="Retrying...">
          Retry
        </Button>
      </form>
      {state.error ? <span className="text-xs text-alert">{state.error}</span> : null}
    </div>
  );
}

function Bubble({ message }: { message: MessageRow }) {
  const inbound = message.direction === "inbound";
  const fromAgent = message.author === "agent";
  const failed = !inbound && message.status === "failed";
  return (
    <div className={`flex flex-col ${inbound ? "items-start" : "items-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
          inbound
            ? "border border-hairline bg-surface"
            : failed
              ? "border border-alert bg-sage-tint text-ink"
              : "border border-edge bg-sage-tint text-ink"
        }`}
      >
        {fromAgent ? (
          <div className="mb-0.5 text-[11px] uppercase tracking-wide text-sage-deep">
            assistant · sent as Meg
          </div>
        ) : null}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <div className={`mt-1 text-[11px] tabular-nums ${inbound ? "text-faint" : "text-sage-deep"}`}>
          {londonTime(message.created_at)}
          {!inbound && STATUS_LABEL[message.status] ? ` · ${STATUS_LABEL[message.status]}` : ""}
        </div>
      </div>
      {failed ? <FailedFooter message={message} /> : null}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-hairline" />
      <span className="text-[11px] uppercase tracking-wide text-faint">{label}</span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

// Scrolls to the bottom on mount and on new messages while Meg is near the
// bottom; otherwise shows a "Jump to latest" pill so a new arrival is never
// silently below the fold.
export function Transcript({ messages }: { messages: MessageRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
    // Mount only: the whole component remounts per thread via ThreadView's key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || lastId === null) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom) {
      scrollToBottom();
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [lastId]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setShowJump(false);
  };

  const rows: ReactNode[] = [];
  let lastDay: string | null = null;
  for (const m of messages) {
    const day = londonDayKey(m.created_at);
    if (day !== lastDay) {
      rows.push(<DayDivider key={`day-${day}`} label={dayDividerLabel(m.created_at)} />);
      lastDay = day;
    }
    rows.push(<Bubble key={m.id} message={m} />);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} onScroll={onScroll} className="h-full space-y-3 overflow-y-auto px-4 py-4">
        {rows}
      </div>
      {showJump ? (
        <button
          type="button"
          onClick={() => {
            scrollToBottom();
            setShowJump(false);
          }}
          className="absolute bottom-3 right-4 rounded-full border border-edge bg-surface px-3 py-1 text-xs text-muted shadow-sm hover:text-ink"
        >
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
