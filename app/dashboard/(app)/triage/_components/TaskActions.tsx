"use client";

import { useState } from "react";

import {
  approveTask,
  dismissTask,
  editApproveTask,
  noteTask,
  snoozeTask,
} from "../actions";

type Panel = "none" | "edit" | "dismiss" | "snooze" | "note";

const BTN =
  "rounded-md border border-[#C9C2B5] bg-white px-4 py-2 text-sm hover:bg-[#FBFAF8] transition-colors";
const FIELD = "w-full border border-[#D8D2C8] rounded-md px-3 py-2 bg-white text-sm";

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

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2.5">
        <form action={approveTask}>
          <input type="hidden" name="taskId" value={taskId} />
          <button
            type="submit"
            className="rounded-md bg-[#A8B2A1] px-4 py-2 text-sm font-medium text-[#1F1F1F] hover:bg-[#96a08f] transition-colors"
          >
            Approve
          </button>
        </form>
        <button className={BTN} onClick={() => setPanel(panel === "edit" ? "none" : "edit")}>
          Edit &amp; Approve
        </button>
        <button className={BTN} onClick={() => setPanel(panel === "dismiss" ? "none" : "dismiss")}>
          Dismiss
        </button>
        <button className={BTN} onClick={() => setPanel(panel === "snooze" ? "none" : "snooze")}>
          Snooze
        </button>
        <button className={BTN} onClick={() => setPanel(panel === "note" ? "none" : "note")}>
          Note
        </button>
      </div>

      {panel === "edit" ? (
        <form action={editApproveTask} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <textarea name="message" rows={5} defaultValue={draftMessage} className={FIELD} />
          <button
            type="submit"
            className="self-start rounded-md bg-[#A8B2A1] px-4 py-2 text-sm font-medium text-[#1F1F1F] hover:bg-[#96a08f]"
          >
            Save &amp; Approve
          </button>
        </form>
      ) : null}

      {panel === "dismiss" ? (
        <form action={dismissTask} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <input name="reason" placeholder="Reason (optional)" className={FIELD} />
          <button type="submit" className={`${BTN} self-start`}>Confirm dismiss</button>
        </form>
      ) : null}

      {panel === "snooze" ? (
        <form action={snoozeTask} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="date" name="until" required className={`${FIELD} max-w-xs`} />
          <button type="submit" className={`${BTN} self-start`}>Confirm snooze</button>
        </form>
      ) : null}

      {panel === "note" ? (
        <form action={noteTask} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <textarea
            name="note"
            rows={3}
            defaultValue={notes ?? ""}
            placeholder="Private note for this task"
            className={FIELD}
          />
          <button type="submit" className={`${BTN} self-start`}>Save note</button>
        </form>
      ) : null}
    </div>
  );
}
