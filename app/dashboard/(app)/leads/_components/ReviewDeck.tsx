"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import type { LeadRow } from "@/lib/leads/queries";

import { approveLeadInline, noteLeadInline, rejectLeadInline } from "../actions";
import { LeadDossier } from "./LeadDossier";
import { AllClear, Button, Textarea } from "../../_components/ui";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded border border-edge bg-surface px-1.5 py-0.5 font-sans text-[11px] text-muted">
      {children}
    </kbd>
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
      <Textarea
        autoFocus
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a private note for this lead…"
        aria-label="Lead note"
        className="w-full"
      />
      <div className="flex gap-2">
        <Button type="button" variant="primary" onClick={save}>
          Save note
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
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

  if (!current)
    return (
      <div className="deck-card">
        <AllClear
          title="All caught up"
          hint={
            reviewed > 0
              ? `${reviewed} ${reviewed === 1 ? "lead" : "leads"} reviewed. Nothing left in the queue.`
              : "Nothing waiting for review."
          }
        />
      </div>
    );

  const remaining = total - index;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-4">
        <span className="text-xs text-muted">
          {index + 1} of {total}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-sage transition-all duration-500"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted">{remaining} left</span>
      </div>

      <div className="relative">
        {remaining > 2 ? (
          <div className="absolute inset-x-4 -bottom-3 h-full rounded-xl border border-hairline bg-inset" />
        ) : null}
        {remaining > 1 ? (
          <div className="absolute inset-x-2 -bottom-1.5 h-full rounded-xl border border-hairline bg-surface" />
        ) : null}

        <div
          key={current.id}
          className={`deck-card relative rounded-xl border border-hairline bg-surface p-7 ${
            leaving === "approve" ? "deck-approve" : ""
          } ${leaving === "reject" ? "deck-reject" : ""}`}
        >
          <LeadDossier lead={current} />

          {showNote ? (
            <NoteForm leadId={current.id} onClose={() => setShowNote(false)} />
          ) : (
            <div
              className={`mt-7 flex items-center gap-2.5 ${leaving ? "pointer-events-none opacity-60" : ""}`}
            >
              <Button type="button" variant="primary" className="flex-1" onClick={() => decide("approve")}>
                Approve
              </Button>
              <Button type="button" variant="secondary" onClick={() => decide("reject")}>
                Reject
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowNote(true)}>
                Note
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] text-muted">
        <Kbd>A</Kbd> approve · <Kbd>R</Kbd> reject · <Kbd>N</Kbd> note · <Kbd>←</Kbd>
        <Kbd>→</Kbd> skip
      </p>
    </div>
  );
}
