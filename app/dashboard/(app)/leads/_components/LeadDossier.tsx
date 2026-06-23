import { leadName } from "@/lib/leads/stages";
import type { LeadRow } from "@/lib/leads/queries";

import { ContactChip } from "./ContactChip";
import { FitRing } from "./FitRing";
import { TypeBadge } from "./TypeBadge";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// The shared "dossier" — one design for a lead, used by both the Review Deck and the
// detail page. Surfaces what Meg actually decides on: who, type, fit, the why, and how to reach them.
export function LeadDossier({ lead }: { lead: LeadRow }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2">
            <TypeBadge type={lead.lead_type} />
          </div>
          <h2 className="font-serif text-[26px] leading-tight text-[#1F1F1F]">
            {leadName(lead)}
          </h2>
        </div>
        <FitRing score={lead.fit_score} size={60} />
      </div>

      {lead.ai_summary ? (
        <p className="mt-4 text-[15.5px] leading-relaxed text-[#3A372F]">{lead.ai_summary}</p>
      ) : (
        <p className="mt-4 text-[14px] italic text-[#A39E94]">No summary yet.</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <ContactChip email={lead.email} phone={lead.phone} />
        {lead.source_url ? (
          <a
            href={lead.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E4DFD6] bg-white px-2.5 py-1 text-[12px] text-[#3A372F] transition-colors hover:border-[#A8B2A1]"
          >
            {hostOf(lead.source_url)}
            <span aria-hidden className="text-[#A39E94]">
              ↗
            </span>
          </a>
        ) : lead.source ? (
          <span className="text-[12px] text-[#8A857B]">{lead.source}</span>
        ) : null}
      </div>
    </div>
  );
}
