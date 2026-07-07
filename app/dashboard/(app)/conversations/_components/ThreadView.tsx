import Link from "next/link";

import type { PendingTask, SiblingThread } from "@/lib/conversations/queries";
import type { Database } from "@/lib/supabase/types";

import { Chip } from "../../_components/ui";
import { Composer } from "./Composer";
import { DraftPanel } from "./DraftPanel";
import { GraceChip } from "./GraceChip";
import { MarkRead } from "./MarkRead";
import { StateControls } from "./StateControls";
import { Transcript } from "./Transcript";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export function ThreadView({
  conversation,
  messages,
  title,
  view,
  pendingTask = null,
  siblings = [],
  unread = false,
}: {
  conversation: {
    id: string;
    client_id: string;
    state: string;
    agent_paused: boolean;
    grace_deadline: string | null;
    rolling_summary: string | null;
  };
  messages: MessageRow[];
  title: string;
  view: "transcript" | "summary";
  pendingTask?: PendingTask | null;
  siblings?: SiblingThread[];
  unread?: boolean;
}) {
  const paused = conversation.agent_paused;
  const latestMessageAt = messages.length > 0 ? messages[messages.length - 1].created_at : null;

  return (
    <div className="flex h-full flex-col rounded-xl border border-edge bg-surface">
      <MarkRead conversationId={conversation.id} unread={unread} latestMessageAt={latestMessageAt} />

      <div className="border-b border-hairline px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="truncate font-serif text-lg">{title}</h2>
            <GraceChip
              deadline={conversation.state === "awaiting_meg" ? conversation.grace_deadline : null}
            />
            {conversation.state === "agent_active" ? <Chip tone="sage">agent active</Chip> : null}
            {paused ? (
              <Chip tone="neutral" dot>
                assistant paused
              </Chip>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`/dashboard/conversations?conversation=${conversation.id}&view=${
                view === "summary" ? "transcript" : "summary"
              }`}
              className="text-xs text-muted underline hover:text-ink"
            >
              {view === "summary" ? "Show transcript" : "Show summary"}
            </Link>
            <StateControls conversationId={conversation.id} paused={paused} />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <Link
            href={`/dashboard/clients/${conversation.client_id}`}
            className="text-muted underline hover:text-ink"
          >
            Client profile
          </Link>
          {pendingTask ? (
            <Link
              href={`/dashboard/triage?task=${pendingTask.id}`}
              className="text-muted underline hover:text-ink"
            >
              Pending task
            </Link>
          ) : null}
          {siblings.length > 0 ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-faint">Household:</span>
              {siblings.map((s) => (
                <Link key={s.id} href={`/dashboard/conversations?conversation=${s.id}`}>
                  <Chip tone={s.state === "awaiting_meg" ? "amber" : "neutral"}>{s.title}</Chip>
                </Link>
              ))}
            </span>
          ) : null}
        </div>
      </div>

      {view === "summary" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="text-sm text-muted">{conversation.rolling_summary ?? "No summary yet."}</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="min-h-0 flex-1 px-4 py-4">
          <p className="text-sm text-muted">No messages yet.</p>
        </div>
      ) : (
        <Transcript messages={messages} />
      )}

      {view === "transcript" && pendingTask ? <DraftPanel task={pendingTask} /> : null}

      <Composer conversationId={conversation.id} />
    </div>
  );
}
