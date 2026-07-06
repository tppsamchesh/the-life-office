"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const ALREADY_CLAIMED = "23505";

export async function claimQuarantined(formData: FormData) {
  const quarantineId = String(formData.get("quarantineId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const familyMemberId = String(formData.get("familyMemberId") ?? "");
  if (!quarantineId || !clientId) return;

  const supabase = await createClient();

  const { data: q, error: qError } = await supabase
    .from("quarantined_messages")
    .select("*")
    .eq("id", quarantineId)
    .is("claimed_client_id", null)
    .maybeSingle();
  if (qError) throw new Error(`Quarantined message not found: ${qError.message}`);
  if (!q) return;

  const { error: chError } = await supabase
    .from("client_channels")
    .insert({
      client_id: clientId,
      channel: q.channel,
      address: q.address,
      family_member_id: familyMemberId || null,
      is_primary: false,
    });
  // A concurrent claim can race us to the (channel, address) unique constraint.
  // The number is registered either way, so treat it as success and still
  // clear the quarantine rows below.
  if (chError && chError.code !== ALREADY_CLAIMED) {
    throw new Error(`Failed to register number: ${chError.message}`);
  }

  const { error: updError } = await supabase
    .from("quarantined_messages")
    .update({ claimed_client_id: clientId })
    .eq("channel", q.channel)
    .eq("address", q.address)
    .is("claimed_client_id", null);
  if (updError) throw new Error(`Failed to clear quarantine: ${updError.message}`);

  revalidatePath("/dashboard/conversations");
  revalidatePath("/dashboard/conversations/quarantine");
}

export async function ignoreQuarantined(formData: FormData) {
  const quarantineId = String(formData.get("quarantineId") ?? "");
  if (!quarantineId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("quarantined_messages")
    .delete()
    .eq("id", quarantineId);
  if (error) throw new Error(`Failed to delete: ${error.message}`);
  revalidatePath("/dashboard/conversations");
  revalidatePath("/dashboard/conversations/quarantine");
}
