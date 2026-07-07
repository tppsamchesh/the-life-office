"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { fetchShellCounts, type ShellCounts } from "@/lib/dashboard/counts";
import { createClient } from "@/lib/supabase/client";

import {
  ReconnectPill,
  useRealtimeChannel,
  type RealtimeStatus,
} from "./realtime";

type ShellCountsValue = { counts: ShellCounts; status: RealtimeStatus };

const ShellCountsContext = createContext<ShellCountsValue | null>(null);

export function useShellCounts(): ShellCountsValue {
  const value = useContext(ShellCountsContext);
  if (!value) {
    throw new Error("useShellCounts must be used inside ShellCountsProvider");
  }
  return value;
}

// Shell-level counts: seeded by the server render, then kept live by a single
// realtime channel over the three tables that feed the sidebar badges.
export function ShellCountsProvider({
  initialCounts,
  children,
}: {
  initialCounts: ShellCounts;
  children: React.ReactNode;
}) {
  const [counts, setCounts] = useState(initialCounts);

  const refetch = useCallback(() => {
    fetchShellCounts(createClient())
      .then(setCounts)
      .catch(() => {
        // Keep the last known counts; the channel's backoff will retry.
      });
  }, []);

  const status = useRealtimeChannel(
    "shell-counts",
    ["tasks", "conversations", "quarantined_messages"],
    refetch,
  );

  return (
    <ShellCountsContext.Provider value={{ counts, status }}>
      {children}
      {status === "reconnecting" ? <ReconnectPill /> : null}
    </ShellCountsContext.Provider>
  );
}
