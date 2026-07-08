"use client";

import { useState } from "react";

import { relativeTime } from "@/lib/conversations/format";

type ActivityItem = {
  id: string;
  description: string;
  created_at: string | null;
};

const VISIBLE_ROWS = 8;

// Recent activity, capped at 8 rows with quiet right-aligned timestamps and a
// client-side "View all" expansion (UI review issue 13).
export function ActivityList({ items }: { items: ActivityItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, VISIBLE_ROWS);

  return (
    <div>
      <ul className="flex flex-col">
        {visible.map((a) => (
          <li
            key={a.id}
            className="flex items-baseline justify-between gap-3 border-b border-hairline py-1.5 text-xs last:border-0"
          >
            <span className="text-ink">{a.description}</span>
            <span className="shrink-0 text-muted">
              {a.created_at ? relativeTime(a.created_at) : ""}
            </span>
          </li>
        ))}
      </ul>
      {!showAll && items.length > VISIBLE_ROWS ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 min-h-11 text-xs text-muted underline hover:text-ink md:min-h-0"
        >
          View all ({items.length})
        </button>
      ) : null}
    </div>
  );
}
