import Link from "next/link";

import { relativeTime } from "@/lib/conversations/format";
import { createClient } from "@/lib/supabase/server";

import { addChannel } from "../actions";

export async function HouseholdThreads({
  clientId, familyMemberId,
}: {
  clientId: string;
  familyMemberId?: string;
}) {
  const supabase = await createClient();
  let channelQuery = supabase
    .from("client_channels")
    .select("id,address,channel,family_member_id, family_member:family_members(first_name), conversation:conversations(id,state,updated_at)")
    .eq("client_id", clientId);
  if (familyMemberId) channelQuery = channelQuery.eq("family_member_id", familyMemberId);
  const { data: channels, error } = await channelQuery;
  if (error) throw new Error(`Failed to load channels: ${error.message}`);

  const { data: familyMembers } = familyMemberId
    ? { data: null }
    : await supabase.from("family_members").select("id,first_name").eq("client_id", clientId);

  return (
    <section className="mt-8">
      <h2 className="font-serif text-lg mb-3">Conversations</h2>
      {(channels ?? []).length === 0 ? (
        <p className="text-sm text-[#8A857B]">No numbers registered yet.</p>
      ) : (
        <ul className="space-y-2">
          {(channels ?? []).map((ch) => {
            const conv = Array.isArray(ch.conversation) ? ch.conversation[0] : ch.conversation;
            const familyMember = Array.isArray(ch.family_member) ? ch.family_member[0] : ch.family_member;
            return (
              <li key={ch.id} className="flex items-center justify-between rounded-lg border border-[#E7E2D9] bg-white px-3 py-2.5">
                <div>
                  <span className="text-sm font-medium">
                    {familyMember?.first_name ?? "Main"} · {ch.address}
                  </span>
                  <span className="ml-2 text-[10px] uppercase text-[#A39E94]">{ch.channel}</span>
                </div>
                {conv ? (
                  <Link
                    href={`/dashboard/conversations?conversation=${conv.id}`}
                    className="text-xs text-[#6B665D] underline hover:text-[#1F1F1F]"
                  >
                    View thread · {relativeTime(conv.updated_at)}
                  </Link>
                ) : (
                  <span className="text-xs text-[#A39E94]">No messages yet</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form action={addChannel} className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="clientId" value={clientId} />
        {familyMemberId ? (
          <input type="hidden" name="familyMemberId" value={familyMemberId} />
        ) : (
          <select name="familyMemberId" defaultValue="" className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs">
            <option value="">The client themself</option>
            {(familyMembers ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.first_name}</option>
            ))}
          </select>
        )}
        <select name="channel" defaultValue="whatsapp" className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs">
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
        </select>
        <input
          name="address"
          required
          placeholder="+447700900123"
          className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs"
        />
        <button type="submit" className="rounded-md border border-[#D8D2C8] px-3 py-1.5 text-xs hover:bg-[#EFEBE4]">
          Add number
        </button>
      </form>
    </section>
  );
}
