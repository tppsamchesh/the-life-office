import { getConciergeStatus } from "@/lib/agents/concierge";

export async function ConciergeCard() {
  const status = await getConciergeStatus();
  return (
    <div className="rounded-xl border border-[#E4DFD6] bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg">Concierge</h2>
        <span className="flex items-center gap-1.5 text-xs text-[#6B665D]">
          <span className={`h-2 w-2 rounded-full ${status.live ? "bg-[#7BA05B]" : "bg-[#C0392B]"}`} />
          {status.live ? "Live" : "Offline"}
        </span>
      </div>
      <p className="mt-1 text-xs text-[#8A857B]">
        Client messaging daemon on the TPP VPS.
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[#A39E94]">Messages today</dt>
          <dd className="mt-1 font-serif text-xl">{status.messagesToday}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[#A39E94]">Awaiting Meg</dt>
          <dd className="mt-1 font-serif text-xl">{status.awaitingMeg}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[#A39E94]">Quarantined</dt>
          <dd className="mt-1 font-serif text-xl">{status.quarantined}</dd>
        </div>
      </dl>
    </div>
  );
}
