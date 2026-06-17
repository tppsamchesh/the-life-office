import Link from "next/link";

import { getClients, householdName } from "@/lib/clients/queries";

import { Chip } from "./_components/ui";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Clients</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        {clients.length} {clients.length === 1 ? "household" : "households"}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/clients/${c.id}`}
            className="rounded-xl border border-[#E7E2D9] bg-white px-5 py-4 transition-colors hover:border-[#A8B2A1]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg">{householdName(c)}</h2>
              <Chip sage={c.status === "active"}>{c.status ?? "active"}</Chip>
            </div>
            <p className="mt-1 text-xs text-[#8A857B]">
              {c.first_name} {c.last_name} · prefers {c.preferred_channel ?? "—"}
            </p>
            <div className="mt-3 flex gap-2">
              <Chip>{c.memberCount} family</Chip>
              <Chip>{c.openTaskCount} open {c.openTaskCount === 1 ? "task" : "tasks"}</Chip>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
