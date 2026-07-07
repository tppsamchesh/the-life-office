"use client";

import { useActionState, useState } from "react";

import { Button, FormError, Input, Textarea } from "../../_components/ui";
import {
  approveTask,
  dismissTask,
  editApproveTask,
  noteTask,
  snoozeTask,
  type TaskActionState,
} from "../actions";

type Panel = "none" | "edit" | "dismiss" | "snooze" | "note";

const INITIAL: TaskActionState = {};

export function TaskActions({
  taskId,
  draftMessage,
  notes,
}: {
  taskId: string;
  draftMessage: string;
  notes: string | null;
}) {
  const [panel, setPanel] = useState<Panel>("none");
  const [approveState, approveAction] = useActionState(approveTask, INITIAL);
  const [editState, editAction] = useActionState(editApproveTask, INITIAL);
  const [dismissState, dismissAction] = useActionState(dismissTask, INITIAL);
  const [snoozeState, snoozeAction] = useActionState(snoozeTask, INITIAL);
  const [noteState, noteAction] = useActionState(noteTask, INITIAL);

  function toggle(next: Panel) {
    setPanel(panel === next ? "none" : next);
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2.5">
        <form action={approveAction}>
          <input type="hidden" name="taskId" value={taskId} />
          <Button type="submit" variant="primary" pendingLabel="Approving…">
            Approve
          </Button>
          <FormError message={approveState.error} />
        </form>
        <Button type="button" variant="secondary" onClick={() => toggle("edit")}>
          Edit &amp; Approve
        </Button>
        <Button type="button" variant="secondary" onClick={() => toggle("dismiss")}>
          Dismiss
        </Button>
        <Button type="button" variant="secondary" onClick={() => toggle("snooze")}>
          Snooze
        </Button>
        <Button type="button" variant="secondary" onClick={() => toggle("note")}>
          Note
        </Button>
      </div>

      {panel === "edit" ? (
        <form action={editAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <Textarea
            name="message"
            rows={5}
            defaultValue={editState.value ?? draftMessage}
            aria-label="Edited reply"
          />
          <FormError message={editState.error} />
          <Button type="submit" variant="primary" pendingLabel="Approving…" className="self-start">
            Save &amp; Approve
          </Button>
        </form>
      ) : null}

      {panel === "dismiss" ? (
        <form action={dismissAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <Input
            name="reason"
            placeholder="Reason (optional)"
            aria-label="Dismiss reason"
            defaultValue={dismissState.value ?? ""}
          />
          <FormError message={dismissState.error} />
          <Button type="submit" variant="secondary" pendingLabel="Dismissing…" className="self-start">
            Confirm dismiss
          </Button>
        </form>
      ) : null}

      {panel === "snooze" ? (
        <form action={snoozeAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <Input
            type="date"
            name="until"
            required
            aria-label="Snooze until"
            defaultValue={snoozeState.value ?? ""}
            className="max-w-xs"
          />
          <FormError message={snoozeState.error} />
          <Button type="submit" variant="secondary" pendingLabel="Snoozing…" className="self-start">
            Confirm snooze
          </Button>
        </form>
      ) : null}

      {panel === "note" ? (
        <form action={noteAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <Textarea
            name="note"
            rows={3}
            defaultValue={noteState.value ?? notes ?? ""}
            placeholder="Private note for this task"
            aria-label="Private note"
          />
          <FormError message={noteState.error} />
          <Button type="submit" variant="secondary" pendingLabel="Saving…" className="self-start">
            Save note
          </Button>
        </form>
      ) : null}
    </div>
  );
}
