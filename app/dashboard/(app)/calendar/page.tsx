import Link from "next/link";

import { getCalendarEntries } from "@/lib/clients/calendar";
import {
  earliestEntry,
  entriesForDate,
  formatCalendarDate,
  groupCalendarEntries,
  todayIso,
} from "@/lib/clients/calendar-view";
import type { DateEntry } from "@/lib/clients/dates";

import { Chip, EmptyCard, SectionLabel } from "../_components/ui";
import { CalendarGrid } from "./_components/CalendarGrid";

export const metadata = { title: "Calendar" };

// Category to chip tone. Insurance moved to the terracotta/alert family
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

function DayView({
  selected,
  dayEntries,
  nextEntry,
}: {
  selected: string;
  dayEntries: DateEntry[];
  nextEntry: DateEntry | null;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>{formatCalendarDate(selected)}</SectionLabel>
        <Link href="/dashboard/calendar?date=all" className="text-xs text-muted hover:underline">
          Show all upcoming
        </Link>
      </div>
      {dayEntries.length === 0 ? (
        <EmptyCard>
          Nothing on {formatCalendarDate(selected)}.
          {nextEntry ? (
            <>
              {" "}
              Next: {nextEntry.label}, {formatCalendarDate(nextEntry.date)}.
            </>
          ) : null}
        </EmptyCard>
      ) : (
        <ul className="flex flex-col gap-2">
          {dayEntries.map((e) => (
            <EntryRow key={e.id} e={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const entries = await getCalendarEntries();
  const today = todayIso();
  const selected =
    date === "all" ? "all" : date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;

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
        <>
          <CalendarGrid entries={entries} selected={selected} today={today} />

          <div className="mt-6">
            {selected === "all" ? (
              <div className="flex flex-col gap-6">
                {groupCalendarEntries(entries).map((group) => (
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
            ) : (
              <DayView
                selected={selected}
                dayEntries={entriesForDate(entries, selected)}
                nextEntry={earliestEntry(entries)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
