"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

// Used in Client Components (e.g. the realtime triage subscription in Plan 2).
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
