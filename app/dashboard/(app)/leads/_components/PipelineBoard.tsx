import Link from "next/link";

import { groupByStage, leadName, STAGES } from "@/lib/leads/stages";
import type { LeadRow } from "@/lib/leads/queries";

import { FitRing } from "./FitRing";
import { HScroll } from "./HScroll";
import { TypeBadge } from "./TypeBadge";

// The full pipeline as an enriched Kanban — every card now carries type, fit, and the why.
export function PipelineBoard({ leads }: { leads: LeadRow[] }) {
  const groups = groupByStage(leads);

  return (
    <HScroll>
      {STAGES.map((s) => {
        const items = groups[s.key];
        return (
          <div key={s.key} className="w-64 shrink-0">
            <div className="mb-2.5 flex items-center justify-between border-b border-sage/40 px-1 pb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {s.label}
              </span>
              <span className="text-[11px] text-muted">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="block rounded-xl border border-hairline bg-surface px-3.5 py-3 transition-colors hover:border-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-lg text-ink">
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
                    <p className="mt-2.5 line-clamp-2 text-xs leading-snug text-muted">
                      {lead.ai_summary}
                    </p>
                  ) : null}
                </Link>
              ))}
              {items.length === 0 ? (
                <p className="px-1 py-2 text-xs text-faint">—</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </HScroll>
  );
}
