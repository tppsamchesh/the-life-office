"use client";

import { useState } from "react";

import type { LeadStage } from "@/lib/leads/stages";

import { Button, Input, Textarea } from "../../_components/ui";
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
            <Button type="submit" variant="primary" pendingLabel="Approving…">Approve</Button>
          </form>
        ) : null}

        {stage === "new" ? (
          <>
            <form action={approveOutreach}>
              <Hidden leadId={leadId} />
              <Button type="submit" variant="primary" pendingLabel="Approving…">
                Approve outreach
              </Button>
            </form>
            <Button type="button" variant="secondary" onClick={() => setPanel(panel === "edit" ? "none" : "edit")}>
              Edit &amp; approve
            </Button>
          </>
        ) : null}

        {stage === "contacted" ? (
          <form action={markQualified}>
            <Hidden leadId={leadId} />
            <Button type="submit" variant="primary" pendingLabel="Saving…">Mark qualified</Button>
          </form>
        ) : null}

        {stage === "qualified" ? (
          <form action={convertLead}>
            <Hidden leadId={leadId} />
            <Button type="submit" variant="primary" pendingLabel="Converting…">
              Convert to client
            </Button>
          </form>
        ) : null}

        {!terminal ? (
          <Button type="button" variant="secondary" onClick={() => setPanel(panel === "reject" ? "none" : "reject")}>
            Reject
          </Button>
        ) : null}

        <Button type="button" variant="secondary" onClick={() => setPanel(panel === "note" ? "none" : "note")}>
          Note
        </Button>
      </div>

      {panel === "edit" ? (
        <form action={editApproveOutreach} className="mt-4 flex flex-col gap-2">
          <Hidden leadId={leadId} />
          <Textarea name="message" rows={5} defaultValue={draftMessage} aria-label="Edited outreach" />
          <Button type="submit" variant="primary" pendingLabel="Approving…" className="self-start">
            Save &amp; approve
          </Button>
        </form>
      ) : null}

      {panel === "reject" ? (
        <form action={rejectLead} className="mt-4 flex flex-col gap-2">
          <Hidden leadId={leadId} />
          <Input name="reason" placeholder="Reason (optional)" aria-label="Reject reason" />
          <Button type="submit" variant="secondary" pendingLabel="Rejecting…" className="self-start">
            Confirm reject
          </Button>
        </form>
      ) : null}

      {panel === "note" ? (
        <form action={noteLead} className="mt-4 flex flex-col gap-2">
          <Hidden leadId={leadId} />
          <Textarea name="note" rows={3} defaultValue={notes ?? ""} aria-label="Lead note" />
          <Button type="submit" variant="secondary" pendingLabel="Saving…" className="self-start">
            Save note
          </Button>
        </form>
      ) : null}
    </div>
  );
}
