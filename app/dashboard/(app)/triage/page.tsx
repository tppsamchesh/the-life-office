import Link from "next/link";

import { getInboxTasks, taskTitle, type InboxTask } from "@/lib/triage/queries";

import { EmptyCard } from "../_components/ui";
import { RealtimeTasks } from "./_components/RealtimeTasks";
import { TaskCard } from "./_components/TaskCard";

const GROUP_LABEL = "px-1 mb-2 text-[11px] font-medium uppercase tracking-wide text-muted";

function TaskItem({ task, active }: { task: InboxTask; active: boolean }) {
  return (
    <li>
      <Link
        href={`/dashboard/triage?task=${task.id}`}
        className={`block rounded-xl border px-3 py-2.5 transition-colors ${
          active
            ? "border-sage bg-surface"
            : "border-hairline bg-surface/60 hover:bg-surface"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              task.urgency === "urgent" ? "bg-alert" : "bg-sage-deep"
            }`}
          />
          <span className="truncate text-sm font-medium">{taskTitle(task)}</span>
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
  const tasks = await getInboxTasks();
  const selected = tasks.find((t) => t.id === selectedId) ?? tasks[0] ?? null;

  // Group the inbox by source so proactive nudges and reactive client requests
  // are scannable separately. Order within each group is preserved (urgent first).
  const groups = [
    { key: "proactive", label: "Proactive", items: tasks.filter((t) => t.source === "proactive") },
    { key: "reactive", label: "Reactive", items: tasks.filter((t) => t.source === "reactive") },
  ].filter((group) => group.items.length > 0);

  return (
    <div>
      <RealtimeTasks />
      <h1 className="font-serif text-2xl mb-1">Triage</h1>
      <p className="text-sm text-muted mb-6">
        {tasks.length} pending {tasks.length === 1 ? "task" : "tasks"}
      </p>

      {tasks.length === 0 ? (
        <EmptyCard>Nothing to triage right now.</EmptyCard>
      ) : (
        <div className="flex gap-6">
          <div className="w-64 shrink-0 flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.key}>
                <p className={GROUP_LABEL}>
                  {group.label} · {group.items.length}
                </p>
                <ul className="flex flex-col gap-2">
                  {group.items.map((t) => (
                    <TaskItem key={t.id} task={t} active={selected?.id === t.id} />
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex-1">{selected ? <TaskCard task={selected} /> : null}</div>
        </div>
      )}
    </div>
  );
}
