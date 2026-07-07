import Link from "next/link";

import { relativeTime, threadTitle } from "@/lib/conversations/format";
import { createClient } from "@/lib/supabase/server";

import { AddChannelForm } from "./AddChannelForm";

export async function HouseholdThreads({
  clientId, familyMemberId, client: householdClient,
}: {
  clientId: string;
  familyMemberId?: string;
  client: { first_name: string; last_name: string | null };
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
        <p className="text-sm text-muted">No numbers registered yet.</p>
      ) : (
        <ul className="space-y-2">
          {(channels ?? []).map((ch) => {
            const conv = Array.isArray(ch.conversation) ? ch.conversation[0] : ch.conversation;
            const familyMember = Array.isArray(ch.family_member) ? ch.family_member[0] : ch.family_member;
            return (
              <li key={ch.id} className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-3 py-2.5">
                <div>
                  <span className="text-sm font-medium">
                    {threadTitle(householdClient, familyMember ? { first_name: familyMember.first_name } : null)}
                  </span>
                  <span className="ml-2 text-xs text-muted">{ch.address}</span>
                  <span className="ml-2 text-[11px] uppercase text-muted">{ch.channel}</span>
                </div>
                {conv ? (
                  <Link
                    href={`/dashboard/conversations?conversation=${conv.id}`}
                    className="text-xs text-muted underline hover:text-ink"
                  >
                    View thread · {relativeTime(conv.updated_at)}
                  </Link>
                ) : (
                  <span className="text-xs text-muted">No messages yet</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddChannelForm
        clientId={clientId}
        familyMemberId={familyMemberId}
        familyMembers={familyMembers ?? []}
      />
    </section>
  );
}
