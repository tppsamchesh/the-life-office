"use client";

import { useEffect, useState } from "react";

import { graceCountdown } from "@/lib/conversations/format";

import { Chip } from "../../_components/ui";

// Live countdown to the grace deadline; renders nothing when there is no deadline.
export function GraceChip({ deadline }: { deadline: string | null }) {
  const [label, setLabel] = useState<string | null>(() => graceCountdown(deadline));

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLabel(graceCountdown(deadline));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!label) return null;
  return <Chip tone="amber">awaiting you · {label}</Chip>;
}
