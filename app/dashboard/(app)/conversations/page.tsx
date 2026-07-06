import Link from "next/link";

import { relativeTime } from "@/lib/conversations/format";
import { getThread, getThreads } from "@/lib/conversations/queries";
import { createClient } from "@/lib/supabase/server";

import { RealtimeConversations } from "./_components/RealtimeConversations";
import { ThreadView } from "./_components/ThreadView";

function StateChip({ state }: { state: string }) {
  if (state === "awaiting_meg")
    return <span className="rounded-full bg-[#F5E9D6] px-2 py-0.5 text-[10px] font-medium text-[#C77D2B]">awaiting you</span>;
  if (state === "agent_active")
    return <span className="rounded-full bg-[#DFE5DA] px-2 py-0.5 text-[10px] font-medium text-[#5F6B58]">agent active</span>;
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
    .select("*", { count: "exact", head: true });

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <RealtimeConversations />
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl mb-1">Conversations</h1>
          <p className="text-sm text-[#8A857B]">
            {threads.length} {threads.length === 1 ? "thread" : "threads"}
          </p>
        </div>
        {quarantineCount ? (
          <Link
            href="/dashboard/conversations/quarantine"
            className="text-sm text-[#C0392B] underline"
          >
            {quarantineCount} unknown {quarantineCount === 1 ? "number" : "numbers"}
          </Link>
        ) : null}
      </div>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-[#E4DFD6] bg-white px-6 py-12 text-center text-sm text-[#8A857B]">
          No conversations yet.
        </div>
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
                    className={`block rounded-lg border px-3 py-2.5 transition-colors ${
                      active ? "border-[#A8B2A1] bg-white" : "border-[#E7E2D9] bg-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${t.unread ? "font-semibold" : "font-medium"}`}>
                        {t.title}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase text-[#A39E94]">{t.channel}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-[#8A857B]">
                        {t.lastMessage?.body ?? "No messages"}
                      </span>
                      <span className="shrink-0 text-[10px] text-[#A39E94]">
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
              <Link href="/dashboard/conversations" className="mb-2 inline-block text-xs text-[#6B665D] underline md:hidden">
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
