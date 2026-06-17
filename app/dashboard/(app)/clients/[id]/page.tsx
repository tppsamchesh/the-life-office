import Link from "next/link";
import { notFound } from "next/navigation";

import { ageFromDob, buildDateEntries } from "@/lib/clients/dates";
import { jsonbToFacts } from "@/lib/clients/preferences";
import { getClient, householdName } from "@/lib/clients/queries";

import { Card, Chip, Empty } from "../_components/ui";

const PREF_FIELDS = [
  { key: "travel_preferences", label: "Travel" },
  { key: "restaurant_preferences", label: "Dining" },
  { key: "dietary_requirements", label: "Dietary" },
  { key: "gift_preferences", label: "Gifting" },
] as const;

function memberRole(type: string, dob: string | null, ageFn: (d: string) => number): string {
  if (type === "child" && dob) return `Child · ${ageFn(dob)}`;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getClient(id);
  if (!detail) notFound();

  const { client, members, lifecycle, openTasks, activity } = detail;
  const now = new Date();
  const dates = buildDateEntries(lifecycle, members, householdName(client), now);
  const channelPhone =
    client.preferred_channel === "imessage"
      ? client.phone_imessage
      : client.preferred_channel === "sms"
        ? client.phone_sms
        : client.phone_whatsapp;
  const address = jsonbToFacts(client.address_home);

  return (
    <div>
      <div className="mb-6 rounded-xl border border-[#D8D2C8] bg-[#EFEBE4] px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#A8B2A1] font-serif text-xl text-[#1F1F1F]">
            {client.last_name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-2xl">{householdName(client)}</h1>
            <p className="mt-0.5 text-xs text-[#6B665D]">
              {client.first_name} {client.last_name} · prefers {client.preferred_channel ?? "—"}
              {client.budget_sensitivity ? ` · budget ${client.budget_sensitivity}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip sage={client.status === "active"}>{client.status ?? "active"}</Chip>
              <Chip>{members.length} family</Chip>
              <Chip>{openTasks.length} open {openTasks.length === 1 ? "task" : "tasks"}</Chip>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card title="Family & household">
            {members.length ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {members.map((m) => (
                  <Link
                    key={m.id}
                    href={`/dashboard/clients/${client.id}/family/${m.id}`}
                    className="rounded-[9px] border border-[#E7E2D9] p-3 text-center transition-colors hover:border-[#A8B2A1] hover:bg-[#FBFAF8]"
                  >
                    <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#D8D2C8] text-[13px] font-semibold">
                      {m.first_name.charAt(0)}
                    </div>
                    <div className="text-[12px] font-semibold">{m.first_name}</div>
                    <div className="text-[10px] text-[#8A857B]">
                      {memberRole(m.type, m.date_of_birth, (d) => ageFromDob(d, now))}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>No family members recorded yet.</Empty>
            )}
          </Card>

          <Card title="Household preferences">
            <div className="flex flex-col gap-3 text-[13px] leading-relaxed">
              {client.communication_style ? (
                <p><span className="font-semibold">Comms:</span> {client.communication_style}</p>
              ) : null}
              {PREF_FIELDS.map((f) => {
                const facts = jsonbToFacts(client[f.key]);
                if (!facts.length) return null;
                return (
                  <p key={f.key}>
                    <span className="font-semibold">{f.label}:</span>{" "}
                    {facts.map((x) => `${x.label.toLowerCase()} ${x.value}`).join(" · ")}
                  </p>
                );
              })}
              {!client.communication_style &&
              PREF_FIELDS.every((f) => !jsonbToFacts(client[f.key]).length) ? (
                <Empty>No preferences recorded yet.</Empty>
              ) : null}
            </div>
          </Card>

          <Card title="Recent activity">
            {activity.length ? (
              <ul className="flex flex-col">
                {activity.map((a) => (
                  <li key={a.id} className="border-b border-[#F1EDE6] py-1.5 text-[12px] last:border-0">
                    <span className="text-[#3A372F]">{a.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No activity yet.</Empty>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Main contact">
            <dl className="flex flex-col gap-1.5 text-[13px]">
              {channelPhone ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8A857B] capitalize">{client.preferred_channel}</dt>
                  <dd>{channelPhone}</dd>
                </div>
              ) : null}
              {client.email ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8A857B]">Email</dt>
                  <dd className="truncate">{client.email}</dd>
                </div>
              ) : null}
              {address.map((a) => (
                <div key={a.label} className="flex justify-between gap-3">
                  <dt className="text-[#8A857B]">{a.label}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
              {!channelPhone && !client.email && !address.length ? (
                <Empty>No contact details on file.</Empty>
              ) : null}
            </dl>
          </Card>

          <Card title="Upcoming dates">
            {dates.length ? (
              <ul className="flex flex-col gap-1.5 text-[12px]">
                {dates.slice(0, 6).map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A8B2A1]" />
                    <span>{d.label}</span>
                    <span className="ml-auto text-[#A39E94]">{d.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nothing upcoming.</Empty>
            )}
          </Card>

          <Card title="Open tasks">
            {openTasks.length ? (
              <ul className="flex flex-col gap-1.5 text-[12px]">
                {openTasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/dashboard/triage?task=${t.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <span className="rounded-full bg-[#A8B2A1] px-2 py-0.5 text-[9px]">
                        {t.request_type}
                      </span>
                      <span className="truncate">{t.request_summary ?? "—"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No open tasks.</Empty>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
