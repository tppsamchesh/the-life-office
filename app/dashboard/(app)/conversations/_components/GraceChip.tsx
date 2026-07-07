"use client";

import { useEffect, useState } from "react";

import { graceCountdown, type GraceStatus } from "@/lib/conversations/format";

import { Chip } from "../../_components/ui";

// Live countdown to the grace deadline; renders nothing when there is no
// deadline. Ticks at minute granularity (30s interval so the boundary is never
// more than 30s stale); the label sits in a fixed-width tabular-nums slot so
// the chip never jitters. Past the deadline it flips to the alert tone.
export function GraceChip({ deadline }: { deadline: string | null }) {
  const [status, setStatus] = useState<GraceStatus | null>(() => graceCountdown(deadline));

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setStatus(graceCountdown(deadline));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!status) return null;
  return (
    <Chip tone={status.overdue ? "alert" : "amber"}>
      awaiting you ·{" "}
      <span className="inline-block min-w-[4.5rem] text-left tabular-nums">{status.label}</span>
    </Chip>
  );
}
