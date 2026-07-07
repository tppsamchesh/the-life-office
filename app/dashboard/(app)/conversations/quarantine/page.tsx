import { getQuarantined } from "@/lib/conversations/queries";
import { relativeTime } from "@/lib/conversations/format";
import { createClient } from "@/lib/supabase/server";

import { BackLink, EmptyCard } from "../../_components/ui";
import { QuarantineActions, type ClientOption } from "./_components/QuarantineActions";

export default async function QuarantinePage() {
  const rows = await getQuarantined();
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id,first_name,last_name,family_members(id,first_name)")
    .order("last_name");

  const clientOptions: ClientOption[] = (clients ?? []).map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    family_members: c.family_members ?? [],
  }));

  return (
    <div>
      <BackLink href="/dashboard/conversations">Conversations</BackLink>
      <h1 className="font-serif text-2xl mb-1 mt-2">Unknown numbers</h1>
      <p className="text-sm text-muted mb-6">
        Messages from numbers not registered to any client. Claim to attach the number to a
        person. Claiming only registers the number going forward. These historical messages
        stay here for reference and are not moved into that client&apos;s conversation.
      </p>

      {rows.length === 0 ? (
        <EmptyCard>Nothing in quarantine.</EmptyCard>
      ) : (
        <ul className="max-w-2xl space-y-3">
          {rows.map((q) => (
            <li key={q.id} className="rounded-xl border border-hairline bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{q.address}</span>
                <span className="text-[11px] uppercase text-muted">
                  {q.channel} · {relativeTime(q.received_at)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{q.body}</p>
              <QuarantineActions quarantineId={q.id} clients={clientOptions} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
