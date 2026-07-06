import { ConciergeCard } from "./_components/ConciergeCard";

export default function AgentsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-2">Agents</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        Agent management will live here, designed in a later cycle.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ConciergeCard />
      </div>
    </div>
  );
}
