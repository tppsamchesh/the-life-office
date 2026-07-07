"use client";

import { useState } from "react";

import type { LeadRow } from "@/lib/leads/queries";

import { PipelineBoard } from "./PipelineBoard";
import { ReviewDeck } from "./ReviewDeck";

// Review-first: the queue Meg lives in is front and centre; the pipeline is one tap away.
export function LeadsWorkspace({
  needsReviewing,
  all,
}: {
  needsReviewing: LeadRow[];
  all: LeadRow[];
}) {
  const [tab, setTab] = useState<"review" | "pipeline">(
    needsReviewing.length > 0 ? "review" : "pipeline",
  );

  function seg(active: boolean) {
    return `rounded-md px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1 ${
      active ? "bg-sage text-ink" : "text-muted hover:text-ink"
    }`;
  }

  return (
    <div>
      <div className="mb-7 inline-flex items-center gap-0.5 rounded-md border border-hairline bg-surface p-0.5">
        <button type="button" onClick={() => setTab("review")} className={seg(tab === "review")}>
          Review
          {needsReviewing.length > 0 ? (
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${
                tab === "review" ? "bg-surface/40 text-ink" : "bg-sage-tint text-sage-deep"
              }`}
            >
              {needsReviewing.length}
            </span>
          ) : null}
        </button>
        <button type="button" onClick={() => setTab("pipeline")} className={seg(tab === "pipeline")}>
          Pipeline
        </button>
      </div>

      {tab === "review" ? <ReviewDeck leads={needsReviewing} /> : <PipelineBoard leads={all} />}
    </div>
  );
}
