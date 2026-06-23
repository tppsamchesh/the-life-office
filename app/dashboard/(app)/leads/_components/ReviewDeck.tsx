"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import type { LeadRow } from "@/lib/leads/queries";

import { approveLeadInline, noteLeadInline, rejectLeadInline } from "../actions";
import { LeadDossier } from "./LeadDossier";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded border border-[#E0DACF] bg-white px-1.5 py-0.5 font-sans text-[10px] text-[#7A766E]">
      {children}
    </kbd>
  );
}

function AllCaughtUp({ reviewed }: { reviewed: number }) {
  return (
    <div className="deck-card mx-auto max-w-xl rounded-2xl border border-[#E7E2D9] bg-white px-8 py-16 text-center">
      <p className="font-serif text-[28px] text-[#1F1F1F]">All caught up</p>
      <p className="mt-2 text-sm text-[#8A857B]">
        {reviewed > 0
          ? `${reviewed} ${reviewed === 1 ? "lead" : "leads"} reviewed. Nothing left in the queue.`
          : "Nothing waiting for review."}
      </p>
    </div>
  );
}

function NoteForm({
  leadId,
  onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [, startTransition] = useTransition();

  function save() {
    startTransition(() => noteLeadInline(leadId, value));
    onClose();
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <textarea
        autoFocus
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a private note for this lead…"
        aria-label="Lead note"
        className="w-full rounded-lg border border-[#D8D2C8] bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          className="rounded-lg bg-[#A8B2A1] px-4 py-2 text-sm font-medium text-[#1F1F1F] transition-colors hover:bg-[#96a08f]"
        >
          Save note
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-[#E4DFD6] bg-white px-4 py-2 text-sm text-[#8A857B] transition-colors hover:bg-[#FBFAF8]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// One lead at a time. Approve/reject in a keystroke; the card lifts away and the deck advances.
export function ReviewDeck({ leads }: { leads: LeadRow[] }) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<null | "approve" | "reject">(null);
  const [showNote, setShowNote] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [, startTransition] = useTransition();

  const total = leads.length;
  const current = leads[index];

  const decide = useCallback(
    (kind: "approve" | "reject") => {
      if (!current || leaving) return;
      const id = current.id;
      setLeaving(kind);
      startTransition(() => {
        if (kind === "approve") approveLeadInline(id);
        else rejectLeadInline(id, "");
      });
      setTimeout(() => {
        setReviewed((n) => n + 1);
        setIndex((i) => i + 1);
        setLeaving(null);
        setShowNote(false);
      }, 380);
    },
    [current, leaving],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showNote) return;
      const k = e.key.toLowerCase();
      if (k === "a") decide("approve");
      else if (k === "r") decide("reject");
      else if (k === "n") setShowNote(true);
      else if (e.key === "ArrowRight" || k === "j") setIndex((i) => Math.min(i + 1, total));
      else if (e.key === "ArrowLeft" || k === "k") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, showNote, total]);

  if (!current) return <AllCaughtUp reviewed={reviewed} />;

  const remaining = total - index;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-4">
        <span className="text-[12px] text-[#8A857B]">
          {index + 1} of {total}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#E7E2D9]">
          <div
            className="h-full rounded-full bg-[#A8B2A1] transition-all duration-500"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
        <span className="text-[12px] text-[#A39E94]">{remaining} left</span>
      </div>

      <div className="relative">
        {remaining > 2 ? (
          <div className="absolute inset-x-4 -bottom-3 h-full rounded-2xl border border-[#ECE7DE] bg-[#FBFAF7]" />
        ) : null}
        {remaining > 1 ? (
          <div className="absolute inset-x-2 -bottom-1.5 h-full rounded-2xl border border-[#EBE6DC] bg-[#FCFBF9]" />
        ) : null}

        <div
          key={current.id}
          className={`deck-card relative rounded-2xl border border-[#E4DFD6] bg-white p-7 ${
            leaving === "approve" ? "deck-approve" : ""
          } ${leaving === "reject" ? "deck-reject" : ""}`}
        >
          <LeadDossier lead={current} />

          {showNote ? (
            <NoteForm leadId={current.id} onClose={() => setShowNote(false)} />
          ) : (
            <div className="mt-7 flex items-center gap-2.5">
              <button
                onClick={() => decide("approve")}
                className="flex-1 rounded-lg bg-[#A8B2A1] px-4 py-2.5 text-sm font-medium text-[#1F1F1F] transition-colors hover:bg-[#96a08f]"
              >
                Approve
              </button>
              <button
                onClick={() => decide("reject")}
                className="rounded-lg border border-[#D8D2C8] bg-white px-4 py-2.5 text-sm text-[#6B665D] transition-colors hover:bg-[#FBFAF8]"
              >
                Reject
              </button>
              <button
                onClick={() => setShowNote(true)}
                className="rounded-lg border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm text-[#8A857B] transition-colors hover:bg-[#FBFAF8]"
              >
                Note
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-[11.5px] text-[#A39E94]">
        <Kbd>A</Kbd> approve · <Kbd>R</Kbd> reject · <Kbd>N</Kbd> note · <Kbd>←</Kbd>
        <Kbd>→</Kbd> skip
      </p>
    </div>
  );
}
