import Link from "next/link";

import { getCalendarEntries } from "@/lib/clients/calendar";

const CATEGORY_COLOR: Record<string, string> = {
  birthday: "#A8B2A1",
  insurance: "#C0392B",
  household: "#C97A5B",
};

export default async function CalendarPage() {
  const entries = await getCalendarEntries();

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Calendar</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        {entries.length} upcoming {entries.length === 1 ? "date" : "dates"} across all clients
      </p>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-[#E4DFD6] bg-white px-6 py-12 text-center text-sm text-[#8A857B]">
          Nothing upcoming.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-[#E7E2D9] bg-white px-4 py-3"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR[e.category] ?? "#A8B2A1" }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{e.label}</div>
                <Link href={`/dashboard/clients/${e.clientId}`} className="text-xs text-[#8A857B] hover:underline">
                  {e.clientName}
                </Link>
              </div>
              <span className="shrink-0 text-xs text-[#A39E94]">{e.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
