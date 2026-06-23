"use client";

import { useState } from "react";

// A published contact, one tap to copy. Greys out when there's nothing to copy.
export function ContactChip({
  email,
  phone,
}: {
  email?: string | null;
  phone?: string | null;
}) {
  const value = email ?? phone ?? null;
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-[12px] text-[#A39E94]">No contact yet</span>;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${value}`}
      className="group inline-flex items-center gap-2 rounded-md border border-[#E4DFD6] bg-white px-2.5 py-1 text-[12px] text-[#3A372F] transition-colors hover:border-[#A8B2A1]"
    >
      <span className="max-w-[220px] truncate">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.08em] text-[#A39E94] group-hover:text-[#7A766E]">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
