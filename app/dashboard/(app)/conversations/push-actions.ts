"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(sub, { onConflict: "endpoint" });
  if (error) throw new Error(`Failed to save subscription: ${error.message}`);
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(`Failed to remove subscription: ${error.message}`);
}
