"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

async function updateLead(id: string, patch: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${id}`);
}

export async function approveOutreach(formData: FormData) {
  const id = String(formData.get("leadId"));
  await updateLead(id, { stage: "contacted", contacted_at: new Date().toISOString() });
  redirect(`/dashboard/leads/${id}`);
}

export async function approveLead(formData: FormData) {
  const id = String(formData.get("leadId"));
  await updateLead(id, { stage: "new" });
  redirect(`/dashboard/leads/${id}`);
}

export async function editApproveOutreach(formData: FormData) {
  const id = String(formData.get("leadId"));
  const message = String(formData.get("message") ?? "");
  await updateLead(id, {
    stage: "contacted",
    contacted_at: new Date().toISOString(),
    meg_edited_message: message,
  });
  redirect(`/dashboard/leads/${id}`);
}

export async function markQualified(formData: FormData) {
  const id = String(formData.get("leadId"));
  await updateLead(id, { stage: "qualified" });
  redirect(`/dashboard/leads/${id}`);
}

export async function rejectLead(formData: FormData) {
  const id = String(formData.get("leadId"));
  const reason = String(formData.get("reason") ?? "");
  await updateLead(id, { stage: "rejected", rejected_reason: reason });
  redirect(`/dashboard/leads/${id}`);
}

export async function noteLead(formData: FormData) {
  const id = String(formData.get("leadId"));
  const note = String(formData.get("note") ?? "");
  await updateLead(id, { notes: note });
  redirect(`/dashboard/leads/${id}`);
}

// Inline variants for the Review Deck: update + revalidate, but DON'T redirect,
// so the deck can animate the card away and advance to the next in place.
export async function approveLeadInline(id: string) {
  await updateLead(id, { stage: "new" });
}

export async function rejectLeadInline(id: string, reason: string) {
  await updateLead(id, { stage: "rejected", rejected_reason: reason || null });
}

export async function noteLeadInline(id: string, note: string) {
  await updateLead(id, { notes: note });
}

// Creates a prefilled client from the lead, links + converts the lead, opens the client.
export async function convertLead(formData: FormData) {
  const id = String(formData.get("leadId"));
  const supabase = await createClient();

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  if (leadErr || !lead) throw new Error("Lead not found");

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({
      first_name: lead.first_name,
      last_name: lead.last_name ?? "",
      email: lead.email,
      phone_whatsapp: lead.phone,
    })
    .select("id")
    .single();
  if (clientErr || !client) throw new Error(`Failed to create client: ${clientErr?.message}`);

  const { error: convertErr } = await supabase
    .from("leads")
    .update({
      stage: "converted",
      converted_at: new Date().toISOString(),
      converted_client_id: client.id,
    })
    .eq("id", id);
  if (convertErr) throw new Error(`Failed to convert lead: ${convertErr.message}`);

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}
