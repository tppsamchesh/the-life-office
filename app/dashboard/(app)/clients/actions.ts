"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ChannelActionState = { error?: string; address?: string };

export async function addChannel(
  _prev: ChannelActionState,
  formData: FormData,
): Promise<ChannelActionState> {
  const clientId = String(formData.get("clientId"));
  const familyMemberId = String(formData.get("familyMemberId") ?? "");
  const channel = String(formData.get("channel"));
  const address = String(formData.get("address") ?? "").trim();
  if (!address.startsWith("+") || !["whatsapp", "sms"].includes(channel)) {
    return { error: "Number must be E.164 (+44...) and channel WhatsApp or SMS.", address };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("client_channels").insert({
    client_id: clientId,
    channel,
    address,
    family_member_id: familyMemberId || null,
    is_primary: false,
  });
  if (error) return { error: `Failed to add number: ${error.message}`, address };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

export type AddClientState = {
  error?: string;
  firstName?: string;
  lastName?: string;
  channel?: string;
  address?: string;
  done?: boolean;
};

export async function addClient(
  _prev: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const channel = String(formData.get("channel") ?? "");
  const address = String(formData.get("address") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "First and last name are required.", firstName, lastName, channel, address };
  }
  if (!address.startsWith("+") || !["whatsapp", "sms"].includes(channel)) {
    return {
      error: "Number must be E.164 (+44...) and channel WhatsApp or SMS.",
      firstName,
      lastName,
      channel,
      address,
    };
  }

  const supabase = await createClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ first_name: firstName, last_name: lastName, status: "active" })
    .select("id")
    .single();
  if (clientError || !client) {
    return {
      error: `Failed to create client: ${clientError?.message ?? "unknown error"}`,
      firstName,
      lastName,
      channel,
      address,
    };
  }

  const { error: channelError } = await supabase.from("client_channels").insert({
    client_id: client.id,
    channel,
    address,
    is_primary: true,
  });
  if (channelError) {
    await supabase.from("clients").delete().eq("id", client.id);
    return {
      error: `Failed to add the contact number: ${channelError.message}`,
      firstName,
      lastName,
      channel,
      address,
    };
  }

  revalidatePath("/dashboard/clients");
  return { done: true };
}
