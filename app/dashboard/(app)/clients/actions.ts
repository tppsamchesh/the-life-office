"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function addChannel(formData: FormData) {
  const clientId = String(formData.get("clientId"));
  const familyMemberId = String(formData.get("familyMemberId") ?? "");
  const channel = String(formData.get("channel"));
  const address = String(formData.get("address") ?? "").trim();
  if (!address.startsWith("+") || !["whatsapp", "sms"].includes(channel)) {
    throw new Error("Number must be E.164 (+44...) and channel whatsapp or sms");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("client_channels").insert({
    client_id: clientId,
    channel,
    address,
    family_member_id: familyMemberId || null,
    is_primary: false,
  });
  if (error) throw new Error(`Failed to add number: ${error.message}`);
  revalidatePath(`/dashboard/clients/${clientId}`);
}
