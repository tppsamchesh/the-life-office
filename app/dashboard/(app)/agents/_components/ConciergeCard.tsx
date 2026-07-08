import Link from "next/link";

import { getConciergeStatus } from "@/lib/agents/concierge";

function Stat({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="block min-h-11 rounded-md py-1 transition-colors hover:bg-inset"
    >
      <span className="block text-[10px] uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="mt-1 block font-serif text-xl tabular-nums">{value}</span>
    </Link>
  );
}

export async function ConciergeCard() {
  const status = await getConciergeStatus();
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg">Concierge</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className={`h-2 w-2 rounded-full ${status.live ? "bg-positive" : "bg-alert"}`}
          />
          {status.live ? "Live" : "Offline"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Client messaging daemon on the TPP VPS.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat
          href="/dashboard/conversations"
          label="Messages today"
          value={status.messagesToday}
        />
        <Stat
          href="/dashboard/conversations"
          label="Awaiting Meg"
          value={status.awaitingMeg}
        />
        <Stat
          href="/dashboard/conversations/quarantine"
          label="Quarantined"
          value={status.quarantined}
        />
      </div>
    </div>
  );
}
