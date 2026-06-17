import Link from "next/link";

import { getInboxTasks, taskTitle } from "@/lib/triage/queries";

import { RealtimeTasks } from "./_components/RealtimeTasks";
import { TaskCard } from "./_components/TaskCard";

export default async function TriagePage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: selectedId } = await searchParams;
  const tasks = await getInboxTasks();
  const selected = tasks.find((t) => t.id === selectedId) ?? tasks[0] ?? null;

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
          <ul className="w-64 shrink-0 flex flex-col gap-2">
            {tasks.map((t) => {
              const active = selected?.id === t.id;
              return (
                <li key={t.id}>
                  <Link
                    href={`/dashboard/triage?task=${t.id}`}
                    className={`block rounded-lg border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-[#A8B2A1] bg-white"
                        : "border-[#E7E2D9] bg-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          t.urgency === "urgent" ? "bg-[#C0392B]" : "bg-[#A8B2A1]"
                        }`}
                      />
                      <span className="truncate text-sm font-medium">{taskTitle(t)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[#8A857B]">
                      {t.request_summary ?? t.request_type}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex-1">{selected ? <TaskCard task={selected} /> : null}</div>
        </div>
      )}
    </div>
  );
}
