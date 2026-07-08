import Link from "next/link";
import { notFound } from "next/navigation";

import { ageFromDob, buildDateEntries } from "@/lib/clients/dates";
import { jsonbToFacts } from "@/lib/clients/preferences";
import { getClient, householdName } from "@/lib/clients/queries";

import { Card, Chip, Empty } from "../../_components/ui";
import { ActivityList } from "../_components/ActivityList";
import { HouseholdThreads } from "../_components/HouseholdThreads";

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
      <div className="mb-6 rounded-xl border border-edge bg-inset px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-sage font-serif text-xl text-ink">
            {client.last_name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-2xl">{householdName(client)}</h1>
            <p className="mt-0.5 text-xs text-muted">
              {client.first_name} {client.last_name} · prefers {client.preferred_channel ?? "—"}
              {client.budget_sensitivity ? ` · budget ${client.budget_sensitivity}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone={client.status === "active" ? "sage" : "neutral"}>{client.status ?? "active"}</Chip>
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
                    className="rounded-md border border-hairline p-3 text-center transition-colors hover:border-sage hover:bg-inset"
                  >
                    <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-edge text-sm font-semibold">
                      {m.first_name.charAt(0)}
                    </div>
                    <div className="text-xs font-semibold">{m.first_name}</div>
                    <div className="text-[11px] text-muted">
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
            <div className="flex flex-col gap-3 text-sm leading-relaxed">
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
              <ActivityList
                items={activity.map((a) => ({
                  id: a.id,
                  description: a.description,
                  created_at: a.created_at,
                }))}
              />
            ) : (
              <Empty>No activity yet.</Empty>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Main contact">
            <dl className="flex flex-col gap-1.5 text-sm">
              {channelPhone ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted capitalize">{client.preferred_channel}</dt>
                  <dd>{channelPhone}</dd>
                </div>
              ) : null}
              {client.email ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Email</dt>
                  <dd className="truncate">{client.email}</dd>
                </div>
              ) : null}
              {address.map((a) => (
                <div key={a.label} className="flex justify-between gap-3">
                  <dt className="text-muted">{a.label}</dt>
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
              <ul className="flex flex-col gap-1.5 text-xs">
                {dates.slice(0, 6).map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-deep" />
                    <span>{d.label}</span>
                    <span className="ml-auto text-muted">{d.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nothing upcoming.</Empty>
            )}
          </Card>

          <Card title="Open tasks">
            {openTasks.length ? (
              <ul className="flex flex-col gap-1.5 text-xs">
                {openTasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/dashboard/triage?task=${t.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Chip tone="sage">{t.request_type}</Chip>
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

      <HouseholdThreads clientId={id} client={{ first_name: client.first_name, last_name: client.last_name }} />
    </div>
  );
}
