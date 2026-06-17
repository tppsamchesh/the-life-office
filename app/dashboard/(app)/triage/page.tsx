import Link from "next/link";

import { getInboxTasks, taskTitle, type InboxTask } from "@/lib/triage/queries";

import { RealtimeTasks } from "./_components/RealtimeTasks";
import { TaskCard } from "./_components/TaskCard";

const GROUP_LABEL = "px-1 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A39E94]";

function TaskItem({ task, active }: { task: InboxTask; active: boolean }) {
  return (
    <li>
      <Link
        href={`/dashboard/triage?task=${task.id}`}
        className={`block rounded-lg border px-3 py-2.5 transition-colors ${
          active
            ? "border-[#A8B2A1] bg-white"
            : "border-[#E7E2D9] bg-white/60 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              task.urgency === "urgent" ? "bg-[#C0392B]" : "bg-[#A8B2A1]"
            }`}
          />
          <span className="truncate text-sm font-medium">{taskTitle(task)}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-[#8A857B]">
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
      <p className="text-sm text-[#8A857B] mb-6">
        {tasks.length} pending {tasks.length === 1 ? "task" : "tasks"}
      </p>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-[#E4DFD6] bg-white px-6 py-12 text-center text-sm text-[#8A857B]">
          Nothing to triage right now.
        </div>
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
