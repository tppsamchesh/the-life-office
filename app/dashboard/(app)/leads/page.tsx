import Link from "next/link";

import { getLeads } from "@/lib/leads/queries";
import { groupByStage, leadName, STAGES } from "@/lib/leads/stages";

import { RealtimeLeads } from "./_components/RealtimeLeads";

export default async function LeadsPage() {
  const leads = await getLeads();
  const groups = groupByStage(leads);

  return (
    <div>
      <RealtimeLeads />
      <h1 className="font-serif text-2xl mb-1">Leads</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        {leads.length} {leads.length === 1 ? "lead" : "leads"} in the pipeline
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((s) => {
          const items = groups[s.key];
          return (
            <div key={s.key} className="w-60 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
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
                    className="rounded-lg border border-[#E7E2D9] bg-white px-3 py-2.5 transition-colors hover:border-[#A8B2A1]"
                  >
                    <div className="text-sm font-medium">{leadName(lead)}</div>
                    {lead.source ? (
                      <div className="mt-0.5 truncate text-xs text-[#8A857B]">{lead.source}</div>
                    ) : null}
                  </Link>
                ))}
                {items.length === 0 ? (
                  <p className="px-1 text-xs text-[#C4BEB2]">—</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
