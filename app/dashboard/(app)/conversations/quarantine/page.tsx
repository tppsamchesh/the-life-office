import Link from "next/link";

import { getQuarantined } from "@/lib/conversations/queries";
import { relativeTime } from "@/lib/conversations/format";
import { createClient } from "@/lib/supabase/server";

import { claimQuarantined, ignoreQuarantined } from "./actions";

export default async function QuarantinePage() {
  const rows = await getQuarantined();
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id,first_name,last_name,family_members(id,first_name)")
    .order("last_name");

  return (
    <div>
      <Link href="/dashboard/conversations" className="text-xs text-[#6B665D] underline">
        Back to conversations
      </Link>
      <h1 className="font-serif text-2xl mb-1 mt-2">Unknown numbers</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        Messages from numbers not registered to any client. Claim to attach the number to a
        person. Claiming only registers the number going forward — these historical messages
        stay here for reference and are not moved into that client&apos;s conversation.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[#E4DFD6] bg-white px-6 py-12 text-center text-sm text-[#8A857B]">
          Nothing in quarantine.
        </div>
      ) : (
        <ul className="max-w-2xl space-y-3">
          {rows.map((q) => (
            <li key={q.id} className="rounded-xl border border-[#E4DFD6] bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{q.address}</span>
                <span className="text-[10px] uppercase text-[#A39E94]">
                  {q.channel} · {relativeTime(q.received_at)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#6B665D]">{q.body}</p>

              <form action={claimQuarantined} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="quarantineId" value={q.id} />
                <select
                  name="clientId"
                  required
                  className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs"
                  defaultValue=""
                >
                  <option value="" disabled>Choose client...</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.last_name}, {c.first_name}</option>
                  ))}
                </select>
                <select
                  name="familyMemberId"
                  className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs"
                  defaultValue=""
                >
                  <option value="">The client themself</option>
                  {(clients ?? []).flatMap((c) =>
                    (c.family_members ?? []).map((m) => (
                      <option key={m.id} value={m.id}>{m.first_name} ({c.last_name})</option>
                    )),
                  )}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-[#A8B2A1] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Claim
                </button>
                <button
                  formAction={ignoreQuarantined}
                  className="rounded-md border border-[#D8D2C8] px-3 py-1.5 text-xs text-[#8A857B] hover:bg-[#EFEBE4]"
                >
                  Ignore
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
