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
  personal: { label: "personal", className: "bg-sage-tint text-sage-deep" },
  role: { label: "role inbox", className: "bg-inset text-muted" },
  generic: { label: "generic inbox", className: "bg-inset text-muted" },
};

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 py-1 text-xs text-ink transition-colors hover:border-sage"
    >
      {label}
      <span aria-hidden className="text-faint">
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
          <h2 className="font-serif text-2xl leading-tight text-ink">
            {leadName(lead)}
          </h2>
          {role || firm ? (
            <p className="mt-1 text-sm text-muted">
              {[role, firm].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <FitRing score={lead.fit_score} size={60} />
      </div>

      {lead.ai_summary ? (
        <p className="mt-4 text-sm leading-relaxed text-ink">{lead.ai_summary}</p>
      ) : (
        <p className="mt-4 text-sm italic text-muted">No summary yet.</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex items-center gap-2">
          <ContactChip email={lead.email} phone={lead.phone} />
          {lead.email && tag ? (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tag.className}`}>
              {tag.label}
            </span>
          ) : null}
        </div>
        {personLinkedin ? <LinkChip href={personLinkedin} label="LinkedIn" /> : null}
        {companyLinkedin ? <LinkChip href={companyLinkedin} label="Company page" /> : null}
        {lead.source_url ? (
          <LinkChip href={lead.source_url} label={hostOf(lead.source_url)} />
        ) : lead.source ? (
          <span className="text-xs text-muted">{lead.source}</span>
        ) : null}
      </div>
    </div>
  );
}
