"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export type RealtimeStatus = "connecting" | "live" | "reconnecting";

// Subscribes to postgres_changes on the given public-schema tables and calls
// onChange for every event. Unlike a bare .subscribe(), it handles the status
// callback: on CHANNEL_ERROR / TIMED_OUT / CLOSED it tears the channel down and
// re-subscribes with capped exponential backoff (1s, 2s, 4s ... 30s max), and on
// a successful re-subscribe it fires onChange once so the page catches up on
// anything missed while disconnected.
export function useRealtimeChannel(
  channelName: string,
  tables: readonly string[],
  onChange: () => void,
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const tablesKey = tables.join(",");
  // A fresh id per mount so two instances (e.g. across a Strict Mode
  // mount/unmount/remount cycle) never build the same topic string, even if
  // both start at attempt 0.
  const instanceIdRef = useRef<string | null>(null);
  if (instanceIdRef.current === null) {
    instanceIdRef.current = Math.random().toString(36).slice(2);
  }

  useEffect(() => {
    const supabase = createClient();
    const instanceId = instanceIdRef.current;
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    function connect() {
      if (disposed) return;
      // A unique topic per attempt (and per mount instance) avoids "already
      // subscribed" collisions.
      const ch = supabase.channel(`${channelName}-${instanceId}-${attempt}`);
      channel = ch;
      for (const table of tablesKey.split(",")) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => {
            // Guard: ignore events delivered to a channel we already
            // replaced/removed or after unmount.
            if (disposed || channel !== ch) return;
            onChangeRef.current();
          },
        );
      }
      ch.subscribe((s) => {
        // Guard: ignore callbacks from a channel we already replaced/removed
        // (removeChannel itself emits CLOSED) and after unmount.
        if (disposed || channel !== ch) return;
        if (s === "SUBSCRIBED") {
          const wasReconnect = attempt > 0;
          attempt = 0;
          setStatus("live");
          if (wasReconnect) onChangeRef.current();
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("reconnecting");
          channel = null;
          supabase.removeChannel(ch);
          attempt += 1;
          const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(connect, delay);
        }
      });
    }

    connect();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) supabase.removeChannel(channel);
      channel = null;
    };
  }, [channelName, tablesKey]);

  return status;
}

// A resumed iOS PWA tab has a dead websocket and a stale server render.
// Refetch the server-rendered tree whenever the tab becomes visible again.
export function useRefreshOnFocus(): void {
  const router = useRouter();
  const lastRefreshRef = useRef(0);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      // The focus and visibilitychange events typically both fire back-to-back
      // when a backgrounded tab becomes active again; coalesce them into a
      // single refresh instead of firing twice for one "tab came back" event.
      const now = Date.now();
      if (now - lastRefreshRef.current < 250) return;
      lastRefreshRef.current = now;
      router.refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
}

// Quiet staleness signal shown while a realtime channel is re-subscribing.
export function ReconnectPill() {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-full bg-amber-tint px-3 py-1.5 text-xs font-medium text-amber shadow-sm">
      Reconnecting, may be stale
    </div>
  );
}
