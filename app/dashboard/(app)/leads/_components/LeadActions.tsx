"use client";

import { useState } from "react";

import type { LeadStage } from "@/lib/leads/stages";

import {
  approveLead,
  approveOutreach,
  convertLead,
  editApproveOutreach,
  markQualified,
  noteLead,
  rejectLead,
} from "../actions";

type Panel = "none" | "edit" | "reject" | "note";

const BTN =
  "rounded-md border border-[#C9C2B5] bg-white px-4 py-2 text-sm hover:bg-[#FBFAF8] transition-colors";
const PRIMARY =
  "rounded-md bg-[#A8B2A1] px-4 py-2 text-sm font-medium text-[#1F1F1F] hover:bg-[#96a08f] transition-colors";
const FIELD = "w-full border border-[#D8D2C8] rounded-md px-3 py-2 bg-white text-sm";

function Hidden({ leadId }: { leadId: string }) {
  return <input type="hidden" name="leadId" value={leadId} />;
}

export function LeadActions({
  leadId,
  stage,
  draftMessage,
  notes,
}: {
  leadId: string;
  stage: LeadStage;
  draftMessage: string;
  notes: string | null;
}) {
  const [panel, setPanel] = useState<Panel>("none");
  const terminal = stage === "converted" || stage === "rejected";

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2.5">
        {stage === "needs_reviewing" ? (
          <form action={approveLead}>
            <Hidden leadId={leadId} />
            <button type="submit" className={PRIMARY}>Approve</button>
          </form>
        ) : null}

        {stage === "new" ? (
          <>
            <form action={approveOutreach}>
              <Hidden leadId={leadId} />
              <button type="submit" className={PRIMARY}>Approve outreach</button>
            </form>
            <button type="button" className={BTN} onClick={() => setPanel(panel === "edit" ? "none" : "edit")}>
              Edit &amp; approve
            </button>
          </>
        ) : null}

        {stage === "contacted" ? (
          <form action={markQualified}>
            <Hidden leadId={leadId} />
            <button type="submit" className={PRIMARY}>Mark qualified</button>
          </form>
        ) : null}

        {stage === "qualified" ? (
          <form action={convertLead}>
            <Hidden leadId={leadId} />
            <button type="submit" className={PRIMARY}>Convert to client</button>
          </form>
        ) : null}

        {!terminal ? (
          <button type="button" className={BTN} onClick={() => setPanel(panel === "reject" ? "none" : "reject")}>
            Reject
          </button>
        ) : null}

        <button type="button" className={BTN} onClick={() => setPanel(panel === "note" ? "none" : "note")}>
          Note
        </button>
      </div>

      {panel === "edit" ? (
        <form action={editApproveOutreach} className="mt-4 flex flex-col gap-2">
          <Hidden leadId={leadId} />
          <textarea name="message" rows={5} defaultValue={draftMessage} aria-label="Edited outreach" className={FIELD} />
          <button type="submit" className={`${PRIMARY} self-start`}>Save &amp; approve</button>
        </form>
      ) : null}

      {panel === "reject" ? (
        <form action={rejectLead} className="mt-4 flex flex-col gap-2">
          <Hidden leadId={leadId} />
          <input name="reason" placeholder="Reason (optional)" aria-label="Reject reason" className={FIELD} />
          <button type="submit" className={`${BTN} self-start`}>Confirm reject</button>
        </form>
      ) : null}

      {panel === "note" ? (
        <form action={noteLead} className="mt-4 flex flex-col gap-2">
          <Hidden leadId={leadId} />
          <textarea name="note" rows={3} defaultValue={notes ?? ""} aria-label="Lead note" className={FIELD} />
          <button type="submit" className={`${BTN} self-start`}>Save note</button>
        </form>
      ) : null}
    </div>
  );
}
