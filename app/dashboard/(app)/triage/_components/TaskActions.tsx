"use client";

import { useActionState, useState } from "react";

import { snoozePresets } from "@/lib/triage/snooze";

import {
  approveTask,
  dismissTask,
  editApproveTask,
  noteTask,
  snoozeTask,
  type TaskActionState,
} from "../actions";

import { Button, FormError, Input, Textarea } from "../../_components/ui";

type Panel = "none" | "edit" | "dismiss" | "snooze" | "note";

const INITIAL: TaskActionState = {};

export function TaskActions({
  taskId,
  nextTaskId = null,
  draftMessage,
  notes,
}: {
  taskId: string;
  nextTaskId?: string | null;
  draftMessage: string;
  notes: string | null;
}) {
  const [panel, setPanel] = useState<Panel>("none");
  const [customUntil, setCustomUntil] = useState("");
  const [approveState, approveAction] = useActionState(approveTask, INITIAL);
  const [editState, editAction] = useActionState(editApproveTask, INITIAL);
  const [dismissState, dismissAction] = useActionState(dismissTask, INITIAL);
  const [snoozeState, snoozeAction] = useActionState(snoozeTask, INITIAL);
  const [noteState, noteAction] = useActionState(noteTask, INITIAL);

  const hidden = (
    <>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="nextTaskId" value={nextTaskId ?? ""} />
    </>
  );

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2.5">
        <form action={approveAction}>
          {hidden}
          <Button type="submit" variant="primary" pendingLabel="Approving...">
            Approve
          </Button>
        </form>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPanel(panel === "edit" ? "none" : "edit")}
        >
          Edit &amp; Approve
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPanel(panel === "dismiss" ? "none" : "dismiss")}
        >
          Dismiss
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPanel(panel === "snooze" ? "none" : "snooze")}
        >
          Snooze
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPanel(panel === "note" ? "none" : "note")}
        >
          Note
        </Button>
      </div>
      <FormError message={approveState.error} />

      {panel === "edit" ? (
        <form action={editAction} className="mt-4 flex flex-col gap-2">
          {hidden}
          <Textarea name="message" rows={5} defaultValue={draftMessage} aria-label="Edited reply" />
          <Button type="submit" variant="primary" pendingLabel="Approving..." className="self-start">
            Save &amp; Approve
          </Button>
          <FormError message={editState.error} />
        </form>
      ) : null}

      {panel === "dismiss" ? (
        <form action={dismissAction} className="mt-4 flex flex-col gap-2">
          {hidden}
          <Input name="reason" placeholder="Reason (optional)" aria-label="Dismiss reason" />
          <Button type="submit" variant="secondary" pendingLabel="Dismissing..." className="self-start">
            Confirm dismiss
          </Button>
          <FormError message={dismissState.error} />
        </form>
      ) : null}

      {panel === "snooze" ? (
        <form action={snoozeAction} className="mt-4 flex flex-col gap-2">
          {hidden}
          <div className="flex flex-wrap gap-2">
            {snoozePresets().map((p) => (
              <Button
                key={p.label}
                type="submit"
                variant="secondary"
                name="until"
                value={p.iso}
                pendingLabel="Snoozing..."
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="datetime-local"
              aria-label="Snooze until"
              value={customUntil}
              onChange={(e) => setCustomUntil(e.target.value)}
              className="max-w-xs"
            />
            <Button
              type="submit"
              variant="secondary"
              name="until"
              value={customUntil ? new Date(customUntil).toISOString() : ""}
              disabled={!customUntil}
              pendingLabel="Snoozing..."
            >
              Confirm snooze
            </Button>
          </div>
          <FormError message={snoozeState.error} />
        </form>
      ) : null}

      {panel === "note" ? (
        <form action={noteAction} className="mt-4 flex flex-col gap-2">
          {hidden}
          <Textarea
            name="note"
            rows={3}
            defaultValue={notes ?? ""}
            placeholder="Private note for this task"
            aria-label="Private note"
          />
          <Button type="submit" variant="secondary" pendingLabel="Saving..." className="self-start">
            Save note
          </Button>
          <FormError message={noteState.error} />
        </form>
      ) : null}
    </div>
  );
}
