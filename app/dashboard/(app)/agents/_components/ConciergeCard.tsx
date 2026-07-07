import { getConciergeStatus } from "@/lib/agents/concierge";

export async function ConciergeCard() {
  const status = await getConciergeStatus();
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg">Concierge</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${status.live ? "bg-positive" : "bg-alert"}`} />
          {status.live ? "Live" : "Offline"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Client messaging daemon on the TPP VPS.
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Messages today</dt>
          <dd className="mt-1 font-serif text-2xl">{status.messagesToday}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Awaiting Meg</dt>
          <dd className="mt-1 font-serif text-2xl">{status.awaitingMeg}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Quarantined</dt>
          <dd className="mt-1 font-serif text-2xl">{status.quarantined}</dd>
        </div>
      </dl>
    </div>
  );
}
