"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { PendingTask } from "@/lib/conversations/queries";

import {
  approveTaskFromThread,
  cancelTaskFromThread,
  editApproveTaskFromThread,
  type ActionState,
} from "../actions";

import { Button, Chip, FormError, SectionLabel, Textarea } from "../../_components/ui";

// The assistant's pending reply, inline in the thread, with the same
// approve / edit / cancel powers as Triage. All three actions are conditional
// on the task still being open; a stale panel surfaces an error.
export function DraftPanel({ task }: { task: PendingTask }) {
  const [editing, setEditing] = useState(false);
  const [approveState, approveAction] = useActionState(approveTaskFromThread, {} as ActionState);
  const [editState, editAction] = useActionState(editApproveTaskFromThread, {} as ActionState);
  const [cancelState, cancelAction] = useActionState(cancelTaskFromThread, {} as ActionState);
  const draft = task.meg_edited_message ?? task.draft_message ?? "";

  return (
    <div className="mx-4 mb-3 rounded-xl border border-edge border-l-2 border-l-sage bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <SectionLabel>Assistant draft · awaiting your approval</SectionLabel>
        <div className="flex items-center gap-2">
          {task.draft_channel ? <Chip tone="neutral">{task.draft_channel}</Chip> : null}
          <Link
            href={`/dashboard/triage?task=${task.id}`}
            className="text-xs text-muted underline hover:text-ink"
          >
            Open in Triage
          </Link>
        </div>
      </div>
      {task.request_summary ? <p className="mb-2 text-xs text-muted">{task.request_summary}</p> : null}

      {editing ? (
        <form action={editAction} className="flex flex-col gap-2">
          <input type="hidden" name="taskId" value={task.id} />
          <Textarea name="message" rows={4} defaultValue={draft} aria-label="Edited draft" />
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" pendingLabel="Sending...">
              Send edited draft
            </Button>
            <Button type="button" variant="quiet" onClick={() => setEditing(false)}>
              Back
            </Button>
          </div>
          <FormError message={editState.error} />
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm text-ink">{draft}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form action={approveAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <Button type="submit" variant="primary" pendingLabel="Approving...">
                Approve
              </Button>
            </form>
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              Edit &amp; send
            </Button>
            <form action={cancelAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <Button type="submit" variant="quiet" pendingLabel="Cancelling...">
                Cancel draft
              </Button>
            </form>
          </div>
          <FormError message={approveState.error ?? cancelState.error} />
        </>
      )}
    </div>
  );
}
