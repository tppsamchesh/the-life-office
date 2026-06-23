import { getLeads } from "@/lib/leads/queries";

import { LeadsWorkspace } from "./_components/LeadsWorkspace";
import { RealtimeLeads } from "./_components/RealtimeLeads";

export default async function LeadsPage() {
  const leads = await getLeads();
  const needsReviewing = leads.filter((l) => (l.stage ?? "new") === "needs_reviewing");

  return (
    <div>
      <RealtimeLeads />
      <h1 className="font-serif text-2xl mb-1">Leads</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        {needsReviewing.length > 0
          ? `${needsReviewing.length} waiting for your review`
          : `${leads.length} ${leads.length === 1 ? "lead" : "leads"} in the pipeline`}
      </p>

      <LeadsWorkspace needsReviewing={needsReviewing} all={leads} />
    </div>
  );
}
