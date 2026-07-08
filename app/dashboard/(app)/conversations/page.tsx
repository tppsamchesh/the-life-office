import Link from "next/link";

import { relativeTime } from "@/lib/conversations/format";
import { getThread, getThreads, type ThreadListItem } from "@/lib/conversations/queries";
import { createClient } from "@/lib/supabase/server";

import { Chip, EmptyCard } from "../_components/ui";
import { GraceChip } from "./_components/GraceChip";
import { PushBanner } from "./_components/PushBanner";
import { RealtimeConversations } from "./_components/RealtimeConversations";
import { ThreadView } from "./_components/ThreadView";

// State/delivery badges for a list row. The paused chip is what makes a
// thread with no concierge coverage visibly different from a healthy idle one.
function RowChips({ item }: { item: ThreadListItem }) {
  const c = item.conversation;
  const hasAny =
    c.state === "awaiting_meg" || c.state === "agent_active" || c.agent_paused || item.failedSend;
  if (!hasAny) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {c.state === "awaiting_meg" ? <GraceChip deadline={c.grace_deadline} /> : null}
      {c.state === "agent_active" ? <Chip tone="sage">agent active</Chip> : null}
      {c.agent_paused ? (
        <Chip tone="neutral" dot>
          assistant paused
        </Chip>
      ) : null}
      {item.failedSend ? (
        <Chip tone="alert" dot>
          send failed
        </Chip>
      ) : null}
    </div>
  );
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; view?: string }>;
}) {
  const { conversation: selectedId, view } = await searchParams;
  const threads = await getThreads();
  const activeId = selectedId ?? threads[0]?.conversation.id ?? null;
  const thread = activeId ? await getThread(activeId) : null;
  const activeItem = thread
    ? threads.find((t) => t.conversation.id === thread.conversation.id) ?? null
    : null;

  const supabase = await createClient();
  const { count: quarantineCount } = await supabase
    .from("quarantined_messages")
    .select("*", { count: "exact", head: true })
    .is("claimed_client_id", null);

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col">
      <RealtimeConversations />
      <PushBanner />
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="mb-1 font-serif text-2xl">Conversations</h1>
          <p className="text-sm text-muted">
            {threads.length} {threads.length === 1 ? "thread" : "threads"}
          </p>
        </div>
        {quarantineCount ? (
          <Link
            href="/dashboard/conversations/quarantine"
            className="inline-flex min-h-11 items-center"
          >
            <Chip tone="neutral">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-alert" />
              {quarantineCount} unknown{" "}
              {quarantineCount === 1 ? "number" : "numbers"}
            </Chip>
          </Link>
        ) : null}
      </div>

      {threads.length === 0 ? (
        <EmptyCard>No conversations yet.</EmptyCard>
      ) : (
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Mobile: full-screen list until a thread is explicitly selected; thread replaces it. */}
          <ul
            className={`w-full space-y-2 overflow-y-auto md:w-72 md:shrink-0 ${
              selectedId ? "hidden md:block" : ""
            }`}
          >
            {threads.map((t) => {
              const active = t.conversation.id === activeId;
              return (
                <li key={t.conversation.id}>
                  <Link
                    href={`/dashboard/conversations?conversation=${t.conversation.id}`}
                    className={`block rounded-xl border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-edge border-l-2 border-l-sage bg-surface shadow-sm"
                        : "border-hairline bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {t.unread ? (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-deep"
                            aria-label="Unread"
                          />
                        ) : null}
                        <span
                          className={`truncate text-sm ${
                            t.unread ? "font-semibold text-ink" : "font-medium text-muted"
                          }`}
                        >
                          {t.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] uppercase text-faint">{t.channel}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted">
                        {t.lastMessage?.body ?? "No messages"}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-faint">
                        {t.lastMessage ? relativeTime(t.lastMessage.created_at) : ""}
                      </span>
                    </div>
                    <RowChips item={t} />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className={`min-w-0 flex-1 ${selectedId ? "" : "hidden md:block"}`}>
            {selectedId ? (
              <Link
                href="/dashboard/conversations"
                className="mb-1 inline-flex min-h-11 items-center text-sm text-muted underline md:hidden"
              >
                ← All conversations
              </Link>
            ) : null}
            {thread ? (
              <ThreadView
                key={thread.conversation.id}
                conversation={thread.conversation}
                messages={thread.messages}
                pendingTask={thread.pendingTask}
                siblings={thread.siblings}
                unread={activeItem?.unread ?? false}
                title={activeItem?.title ?? "Conversation"}
                view={view === "summary" ? "summary" : "transcript"}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
