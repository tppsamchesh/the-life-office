import Link from "next/link";

import { getCalendarEntries } from "@/lib/clients/calendar";
import {
  formatCalendarDate,
  groupCalendarEntries,
} from "@/lib/clients/calendar-view";
import type { DateEntry } from "@/lib/clients/dates";

import { Chip, EmptyCard, SectionLabel } from "../_components/ui";

export const metadata = { title: "Calendar" };

// Category → chip tone. Insurance moves to the terracotta/alert family
// (formerly fire-alarm #C0392B); birthdays stay in the sage family; anything
// unmapped reads neutral.
const CATEGORY_TONE: Record<string, "neutral" | "sage" | "amber" | "alert"> = {
  birthday: "sage",
  insurance: "alert",
  household: "neutral",
};

function EntryRow({ e }: { e: DateEntry }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{e.label}</div>
        <Link
          href={`/dashboard/clients/${e.clientId}`}
          className="text-xs text-muted hover:underline"
        >
          {e.clientName}
        </Link>
      </div>
      <Chip tone={CATEGORY_TONE[e.category] ?? "neutral"} dot>
        {e.category}
      </Chip>
      <span className="w-24 shrink-0 text-right text-sm text-muted">
        {formatCalendarDate(e.date)}
      </span>
    </li>
  );
}

export default async function CalendarPage() {
  const entries = await getCalendarEntries();
  const groups = groupCalendarEntries(entries);

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Calendar</h1>
      <p className="text-sm text-muted mb-6">
        {entries.length} upcoming {entries.length === 1 ? "date" : "dates"} across all clients
      </p>

      {entries.length === 0 ? (
        <EmptyCard>
          Nothing upcoming. Birthdays and key dates appear here as soon as
          they are on a client&apos;s file.
        </EmptyCard>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key}>
              <SectionLabel>{group.label}</SectionLabel>
              <ul className="flex flex-col gap-2">
                {group.items.map((e) => (
                  <EntryRow key={e.id} e={e} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
