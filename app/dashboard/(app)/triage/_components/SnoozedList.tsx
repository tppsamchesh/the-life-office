"use client";

import { useActionState } from "react";

import { wakeTask, type TaskActionState } from "../actions";

import { Button, FormError } from "../../_components/ui";

// The "Snoozed (N)" section: snoozed tasks were previously invisible until
// they woke. Rows show the wake time and offer an immediate wake.
export function SnoozedList({
  items,
}: {
  items: { id: string; title: string; wakeLabel: string }[];
}) {
  const [state, formAction] = useActionState(wakeTask, {} as TaskActionState);

  return (
    <div>
      <FormError message={state.error} />
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface/60 px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-muted">{item.title}</span>
              <span className="block text-[11px] tabular-nums text-faint">wakes {item.wakeLabel}</span>
            </span>
            <form action={formAction}>
              <input type="hidden" name="taskId" value={item.id} />
              <Button type="submit" variant="quiet" pendingLabel="Waking...">
                Wake now
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
