import { ConciergeCard } from "./_components/ConciergeCard";

export default function AgentsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-2">Agents</h1>
      <p className="text-sm text-muted mb-6">
        The staff room: every agent working for you, and whether it&apos;s on duty.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ConciergeCard />
      </div>
    </div>
  );
}
