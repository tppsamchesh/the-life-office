"use client";

import { useEffect, useState } from "react";

import { graceCountdown } from "@/lib/conversations/format";

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
  return (
    <span className="rounded-full bg-[#F5E9D6] px-2 py-0.5 text-[11px] font-medium text-[#C77D2B]">
      awaiting you · {label}
    </span>
  );
}
