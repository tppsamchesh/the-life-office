import { getQuarantined } from "@/lib/conversations/queries";
import { relativeTime } from "@/lib/conversations/format";
import { createClient } from "@/lib/supabase/server";

import { AllClear, Chip, DetailHeader } from "../../_components/ui";
import { QuarantineActions, type ClientOption } from "./_components/QuarantineActions";

export const metadata = { title: "Unknown numbers" };

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
      <DetailHeader
        back={{ href: "/dashboard/conversations", label: "Conversations" }}
        title="Unknown numbers"
        chip={
          rows.length ? (
            <Chip tone="neutral">
              <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-alert" />
              {rows.length}
            </Chip>
          ) : undefined
        }
      />
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Messages from numbers not registered to any client. Claim to attach the number to a
        person. Claiming only registers the number going forward. These historical messages
        stay here for reference and are not moved into that client&apos;s conversation.
      </p>

      {rows.length === 0 ? (
        <AllClear
          title="All clear, no unknown numbers"
          hint="Messages from unrecognised numbers wait here for you to claim or ignore."
        />
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
