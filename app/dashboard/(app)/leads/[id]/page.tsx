import Link from "next/link";
import { notFound } from "next/navigation";

import { getLead } from "@/lib/leads/queries";
import { leadName, STAGES, type LeadStage } from "@/lib/leads/stages";

import { LeadActions } from "../_components/LeadActions";

const LABEL = "text-[10px] tracking-[0.14em] uppercase text-[#A39E94]";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const stage = (lead.stage ?? "new") as LeadStage;
  const stageLabel = STAGES.find((s) => s.key === stage)?.label ?? stage;
  const outreach = lead.meg_edited_message ?? lead.draft_message;

  return (
    <div>
      <Link href="/dashboard/leads" className="text-xs text-[#8A857B] hover:underline">
        ← Leads
      </Link>

      <div className="mt-2 mb-5 flex items-center gap-3">
        <h1 className="font-serif text-2xl">{leadName(lead)}</h1>
        <span className="rounded-full border border-[#C9C2B5] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#6B665D]">
          {stageLabel}
        </span>
      </div>

      <div className="rounded-xl border border-[#E4DFD6] bg-white p-6 shadow-sm">
        <dl className="mb-5 flex flex-col gap-1.5 text-[13px]">
          {lead.source ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#8A857B]">Source</dt>
              <dd className="text-right">{lead.source}</dd>
            </div>
          ) : null}
          {lead.email ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#8A857B]">Email</dt>
              <dd className="truncate">{lead.email}</dd>
            </div>
          ) : null}
          {lead.phone ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#8A857B]">Phone</dt>
              <dd>{lead.phone}</dd>
            </div>
          ) : null}
        </dl>

        {outreach ? (
          <div className="mb-5 rounded-lg border border-[#E4DFD6] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className={LABEL}>Draft outreach</span>
              {lead.draft_channel ? (
                <span className="rounded-full border border-[#C9C2B5] px-2.5 py-0.5 text-[10px] text-[#6B665D]">
                  {lead.draft_channel}
                </span>
              ) : null}
            </div>
            <p className="font-mono text-[13px] leading-relaxed text-[#3A372F] whitespace-pre-wrap">
              {outreach}
            </p>
          </div>
        ) : null}

        {lead.rejected_reason ? (
          <p className="mb-3 text-[12.5px] text-[#8A857B]">
            <span className={LABEL}>Rejected</span> — {lead.rejected_reason}
          </p>
        ) : null}
        {lead.notes ? (
          <p className="mb-1 text-[13px] text-[#3A372F]">
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
