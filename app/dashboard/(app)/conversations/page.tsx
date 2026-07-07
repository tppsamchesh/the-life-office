import Link from "next/link";

import { relativeTime } from "@/lib/conversations/format";
import { getThread, getThreads } from "@/lib/conversations/queries";
import { createClient } from "@/lib/supabase/server";

import { Chip, EmptyCard } from "../_components/ui";
import { PushBanner } from "./_components/PushBanner";
import { RealtimeConversations } from "./_components/RealtimeConversations";
import { ThreadView } from "./_components/ThreadView";

function StateChip({ state }: { state: string }) {
  if (state === "awaiting_meg") return <Chip tone="amber">awaiting you</Chip>;
  if (state === "agent_active") return <Chip tone="sage">agent active</Chip>;
  return null;
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

  const supabase = await createClient();
  const { count: quarantineCount } = await supabase
    .from("quarantined_messages")
    .select("*", { count: "exact", head: true })
    .is("claimed_client_id", null);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <RealtimeConversations />
      <PushBanner />
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl mb-1">Conversations</h1>
          <p className="text-sm text-muted">
            {threads.length} {threads.length === 1 ? "thread" : "threads"}
          </p>
        </div>
        {quarantineCount ? (
          <Link
            href="/dashboard/conversations/quarantine"
            className="text-sm text-alert underline"
          >
            {quarantineCount} unknown {quarantineCount === 1 ? "number" : "numbers"}
          </Link>
        ) : null}
      </div>

      {threads.length === 0 ? (
        <EmptyCard>No conversations yet.</EmptyCard>
      ) : (
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Mobile: full-screen list until a thread is explicitly selected; thread replaces it. */}
          <ul className={`w-full space-y-2 overflow-y-auto md:w-72 md:shrink-0 ${selectedId ? "hidden md:block" : ""}`}>
            {threads.map((t) => {
              const active = t.conversation.id === activeId;
              return (
                <li key={t.conversation.id}>
                  <Link
                    href={`/dashboard/conversations?conversation=${t.conversation.id}`}
                    className={`block rounded-xl border px-3 py-2.5 transition-colors ${
                      active ? "border-sage bg-surface" : "border-hairline bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${t.unread ? "font-semibold" : "font-medium"}`}>
                        {t.title}
                      </span>
                      <span className="shrink-0 text-[11px] uppercase text-muted">{t.channel}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted">
                        {t.lastMessage?.body ?? "No messages"}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {t.lastMessage ? relativeTime(t.lastMessage.created_at) : ""}
                      </span>
                    </div>
                    <div className="mt-1">
                      <StateChip state={t.conversation.state} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className={`min-w-0 flex-1 ${selectedId ? "" : "hidden md:block"}`}>
            {selectedId ? (
              <Link href="/dashboard/conversations" className="mb-2 inline-block text-xs text-muted underline md:hidden">
                Back to all conversations
              </Link>
            ) : null}
            {thread ? (
              <ThreadView
                conversation={thread.conversation}
                messages={thread.messages}
                title={
                  threads.find((t) => t.conversation.id === thread.conversation.id)?.title ?? "Conversation"
                }
                view={view === "summary" ? "summary" : "transcript"}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
