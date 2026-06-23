import Link from "next/link";

import { groupByStage, leadName, STAGES } from "@/lib/leads/stages";
import type { LeadRow } from "@/lib/leads/queries";

import { FitRing } from "./FitRing";
import { TypeBadge } from "./TypeBadge";

// The full pipeline as an enriched Kanban — every card now carries type, fit, and the why.
export function PipelineBoard({ leads }: { leads: LeadRow[] }) {
  const groups = groupByStage(leads);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGES.map((s) => {
        const items = groups[s.key];
        return (
          <div key={s.key} className="w-64 shrink-0">
            <div className="mb-2.5 flex items-center justify-between border-b border-[#A8B2A1]/40 px-1 pb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A766E]">
                {s.label}
              </span>
              <span className="text-[11px] text-[#A39E94]">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="block rounded-xl border border-[#E7E2D9] bg-white px-3.5 py-3 transition-colors hover:border-[#A8B2A1]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-[15px] text-[#1F1F1F]">
                        {leadName(lead)}
                      </div>
                      <div className="mt-1.5">
                        <TypeBadge type={lead.lead_type} />
                      </div>
                    </div>
                    {lead.fit_score != null ? (
                      <FitRing score={lead.fit_score} size={34} stroke={3} />
                    ) : null}
                  </div>
                  {lead.ai_summary ? (
                    <p className="mt-2.5 line-clamp-2 text-[12px] leading-snug text-[#8A857B]">
                      {lead.ai_summary}
                    </p>
                  ) : null}
                </Link>
              ))}
              {items.length === 0 ? (
                <p className="px-1 py-2 text-xs text-[#C4BEB2]">—</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
