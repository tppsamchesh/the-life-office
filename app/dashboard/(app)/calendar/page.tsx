import Link from "next/link";

import { EmptyCard } from "../_components/ui";
import { getCalendarEntries } from "@/lib/clients/calendar";

const CATEGORY_DOT: Record<string, string> = {
  birthday: "bg-sage-deep",
  insurance: "bg-alert",
  household: "bg-amber",
};

export default async function CalendarPage() {
  const entries = await getCalendarEntries();

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Calendar</h1>
      <p className="text-sm text-muted mb-6">
        {entries.length} upcoming {entries.length === 1 ? "date" : "dates"} across all clients
      </p>

      {entries.length === 0 ? (
        <EmptyCard>Nothing upcoming.</EmptyCard>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[e.category] ?? "bg-sage-deep"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{e.label}</div>
                <Link href={`/dashboard/clients/${e.clientId}`} className="text-xs text-muted hover:underline">
                  {e.clientName}
                </Link>
              </div>
              <span className="shrink-0 text-xs text-muted">{e.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
