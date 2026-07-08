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
    return <span className="text-xs text-muted">No contact yet</span>;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable, no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${value}`}
      className="group inline-flex items-center gap-2 rounded-md border border-hairline bg-surface px-2.5 py-1 text-xs text-ink transition-colors hover:border-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1"
    >
      <span className="max-w-[220px] truncate">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted group-hover:text-ink">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
