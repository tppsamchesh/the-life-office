import Link from "next/link";

import { relativeTime } from "@/lib/conversations/format";
import type { DeliveryState } from "@/lib/triage/approved";
import {
  getInboxTasks,
  getRecentlyApproved,
  getSnoozedTasks,
  taskTitle,
  type InboxTask,
} from "@/lib/triage/queries";

import { Chip, EmptyCard, SectionLabel } from "../_components/ui";
import { RealtimeTasks } from "./_components/RealtimeTasks";
import { SnoozedList } from "./_components/SnoozedList";
import { TaskCard } from "./_components/TaskCard";

const DELIVERY_TONE: Record<DeliveryState, "neutral" | "sage" | "alert"> = {
  waiting: "neutral", queued: "neutral", sending: "neutral",
  sent: "sage", delivered: "sage", failed: "alert", cancelled: "alert",
};
const DELIVERY_LABEL: Record<DeliveryState, string> = {
  waiting: "waiting for assistant", queued: "queued", sending: "sending",
  sent: "sent", delivered: "delivered", failed: "failed", cancelled: "cancelled",
};

function TaskItem({ task, active }: { task: InboxTask; active: boolean }) {
  const urgent = task.urgency === "urgent";
  const accent = active
    ? "border-edge border-l-2 border-l-sage bg-surface shadow-sm"
    : urgent
      ? "border-hairline border-l-2 border-l-alert bg-surface/60 hover:bg-surface"
      : "border-hairline bg-surface/60 hover:bg-surface";
  return (
    <li>
      <Link
        href={`/dashboard/triage?task=${task.id}`}
        className={`block rounded-lg border px-3 py-2.5 transition-colors ${accent}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{taskTitle(task)}</span>
          {task.created_at ? (
            <span className="shrink-0 text-[11px] tabular-nums text-faint">
              {relativeTime(task.created_at)}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted">
          {task.request_summary ?? task.request_type}
        </div>
      </Link>
    </li>
  );
}

export default async function TriagePage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: selectedId } = await searchParams;
  const [tasks, snoozed, approved] = await Promise.all([
    getInboxTasks(),
    getSnoozedTasks(),
    getRecentlyApproved(),
  ]);

  // Explicit selection: a stale ?task= shows a notice instead of silently
  // swapping a different task under Meg's cursor (UX issue 9). Only a bare
  // visit (no param) auto-selects the first task.
  const selected = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : tasks[0] ?? null;
  const selectionMissing = Boolean(selectedId && !selected);

  // Group the inbox by source so proactive nudges and reactive client requests
  // are scannable separately. Order within each group is preserved (urgent first).
  const groups = [
    { key: "proactive", label: "Proactive", items: tasks.filter((t) => t.source === "proactive") },
    { key: "reactive", label: "Reactive", items: tasks.filter((t) => t.source === "reactive") },
  ].filter((group) => group.items.length > 0);

  // Next task in rendered order, for the post-action redirect; falls back to
  // the previous one at the end of the list.
  const renderedOrder = groups.flatMap((g) => g.items);
  let nextTaskId: string | null = null;
  if (selected) {
    const idx = renderedOrder.findIndex((t) => t.id === selected.id);
    nextTaskId = renderedOrder[idx + 1]?.id ?? renderedOrder[idx - 1]?.id ?? null;
  }

  const snoozedItems = snoozed.map((t) => ({
    id: t.id,
    title: taskTitle(t),
    wakeLabel: t.snoozed_until
      ? new Date(t.snoozed_until).toLocaleString("en-GB", {
          weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
        })
      : "",
  }));

  return (
    <div>
      <RealtimeTasks />
      <h1 className="mb-1 font-serif text-2xl">Triage</h1>
      <p className="mb-6 text-sm text-muted">
        {tasks.length} pending {tasks.length === 1 ? "task" : "tasks"}
      </p>

      {approved.length > 0 ? (
        <div className="mb-6 rounded-xl border border-hairline bg-surface px-4 py-3">
          <SectionLabel>Approved · last 24h</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {approved.map(({ task, delivery }) => (
              <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{taskTitle(task)}</span>
                  <span className="shrink-0 text-xs tabular-nums text-faint">
                    {task.approved_at ? relativeTime(task.approved_at) : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Chip tone={DELIVERY_TONE[delivery]} dot>
                    {DELIVERY_LABEL[delivery]}
                  </Chip>
                  {delivery === "failed" && task.conversation_id ? (
                    <Link
                      href={`/dashboard/conversations?conversation=${task.conversation_id}`}
                      className="text-xs text-alert underline"
                    >
                      View thread
                    </Link>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tasks.length === 0 && snoozed.length === 0 ? (
        <EmptyCard>Nothing to triage right now.</EmptyCard>
      ) : (
        <div className="flex gap-6">
          <div className="flex w-64 shrink-0 flex-col gap-5">
            {groups.map((group) => (
              <div key={group.key}>
                <SectionLabel className="mb-2 px-1">
                  {group.label} · {group.items.length}
                </SectionLabel>
                <ul className="flex flex-col gap-2">
                  {group.items.map((t) => (
                    <TaskItem key={t.id} task={t} active={selected?.id === t.id} />
                  ))}
                </ul>
              </div>
            ))}
            {snoozed.length > 0 ? (
              <div>
                <SectionLabel className="mb-2 px-1">Snoozed · {snoozed.length}</SectionLabel>
                <SnoozedList items={snoozedItems} />
              </div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            {selectionMissing ? (
              <EmptyCard>
                That task is no longer in the queue. It may have been approved, dismissed, or
                snoozed elsewhere.{" "}
                <Link href="/dashboard/triage" className="underline">
                  Back to the queue
                </Link>
              </EmptyCard>
            ) : selected ? (
              <TaskCard key={selected.id} task={selected} nextTaskId={nextTaskId} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
