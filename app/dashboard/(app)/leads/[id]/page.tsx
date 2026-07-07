import { notFound } from "next/navigation";

import { getLead } from "@/lib/leads/queries";
import { STAGES, type LeadStage } from "@/lib/leads/stages";

import { LeadActions } from "../_components/LeadActions";
import { LeadDossier } from "../_components/LeadDossier";
import { BackLink, Chip } from "../../_components/ui";

const LABEL = "text-[11px] font-medium uppercase tracking-wide text-muted";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const stage = (lead.stage ?? "new") as LeadStage;
  const stageLabel = STAGES.find((s) => s.key === stage)?.label ?? stage;
  // Drafting is a post-approval step — only show outreach once one actually exists.
  const outreach = lead.meg_edited_message ?? lead.draft_message;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href="/dashboard/leads">Leads</BackLink>
        <Chip>{stageLabel}</Chip>
      </div>

      <div className="rounded-xl border border-hairline bg-surface p-6 shadow-sm">
        <LeadDossier lead={lead} />

        {outreach ? (
          <div className="mt-5 rounded-xl border border-hairline p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className={LABEL}>Draft outreach</span>
              {lead.draft_channel ? <Chip>{lead.draft_channel}</Chip> : null}
            </div>
            <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink">
              {outreach}
            </p>
          </div>
        ) : null}

        {lead.rejected_reason ? (
          <p className="mt-5 text-xs text-muted">
            <span className={LABEL}>Rejected</span> — {lead.rejected_reason}
          </p>
        ) : null}
        {lead.notes ? (
          <p className="mt-5 text-sm text-ink">
            <span className={LABEL}>Notes</span>
            <br />
            {lead.notes}
          </p>
        ) : null}

        <LeadActions
          leadId={lead.id}
          stage={stage}
          draftMessage={outreach ?? ""}
          notes={lead.notes}
        />
      </div>
    </div>
  );
}
