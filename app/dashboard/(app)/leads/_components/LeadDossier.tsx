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

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

const EMAIL_TAG: Record<string, { label: string; className: string }> = {
  personal: { label: "personal", className: "bg-[#EBEFE8] text-[#46503E]" },
  role: { label: "role inbox", className: "bg-[#F1ECE3] text-[#5C5648]" },
  generic: { label: "generic inbox", className: "bg-[#F2EEE6] text-[#8A857B]" },
};

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-[#E4DFD6] bg-white px-2.5 py-1 text-[12px] text-[#3A372F] transition-colors hover:border-[#A8B2A1]"
    >
      {label}
      <span aria-hidden className="text-[#A39E94]">
        ↗
      </span>
    </a>
  );
}

// The shared "dossier" — one design for a lead, used by both the Review Deck and the
// detail page. Surfaces what gives Meg confidence: who (named person + role), their fit,
// the why, and real ways to verify and reach them (email quality + LinkedIn).
export function LeadDossier({ lead }: { lead: LeadRow }) {
  const brief = (lead.brief ?? {}) as Record<string, unknown>;
  const role = str(brief.role);
  const firm = str(brief.firm) ?? (lead.source_url ? hostOf(lead.source_url) : null);
  const personLinkedin = str(brief.person_linkedin);
  const companyLinkedin = str(brief.company_linkedin);
  const emailType = str(brief.email_type);
  const tag = emailType ? EMAIL_TAG[emailType] : null;

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
          {role || firm ? (
            <p className="mt-1 text-[13px] text-[#8A857B]">
              {[role, firm].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <FitRing score={lead.fit_score} size={60} />
      </div>

      {lead.ai_summary ? (
        <p className="mt-4 text-[15.5px] leading-relaxed text-[#3A372F]">{lead.ai_summary}</p>
      ) : (
        <p className="mt-4 text-[14px] italic text-[#A39E94]">No summary yet.</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex items-center gap-2">
          <ContactChip email={lead.email} phone={lead.phone} />
          {lead.email && tag ? (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tag.className}`}>
              {tag.label}
            </span>
          ) : null}
        </div>
        {personLinkedin ? <LinkChip href={personLinkedin} label="LinkedIn" /> : null}
        {companyLinkedin ? <LinkChip href={companyLinkedin} label="Company page" /> : null}
        {lead.source_url ? (
          <LinkChip href={lead.source_url} label={hostOf(lead.source_url)} />
        ) : lead.source ? (
          <span className="text-[12px] text-[#8A857B]">{lead.source}</span>
        ) : null}
      </div>
    </div>
  );
}
