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
    return `rounded-md px-3.5 py-1.5 text-sm transition-colors ${
      active ? "bg-[#A8B2A1] text-[#1F1F1F]" : "text-[#7A766E] hover:text-[#3A372F]"
    }`;
  }

  return (
    <div>
      <div className="mb-7 inline-flex items-center gap-0.5 rounded-lg border border-[#E4DFD6] bg-white p-0.5">
        <button type="button" onClick={() => setTab("review")} className={seg(tab === "review")}>
          Review
          {needsReviewing.length > 0 ? (
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                tab === "review" ? "bg-white/40 text-[#2C2C28]" : "bg-[#EBEFE8] text-[#46503E]"
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
