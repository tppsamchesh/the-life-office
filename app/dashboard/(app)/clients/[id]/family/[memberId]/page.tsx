import Link from "next/link";
import { notFound } from "next/navigation";

import { ageFromDob } from "@/lib/clients/dates";
import { jsonbToFacts } from "@/lib/clients/preferences";
import { getFamilyMember, householdName } from "@/lib/clients/queries";

import { Card, Chip, DetailHeader, Empty } from "../../../../_components/ui";
import { HouseholdThreads } from "../../../_components/HouseholdThreads";

export default async function FamilyMemberPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const { id, memberId } = await params;
  const detail = await getFamilyMember(id, memberId);
  if (!detail) notFound();

  const { client, member, lifecycle, tasks, activity } = detail;
  const now = new Date();
  const facts = jsonbToFacts(member.details);
  const roleLabel =
    member.type === "child" && member.date_of_birth
      ? `Child · ${ageFromDob(member.date_of_birth, now)}`
      : member.type.charAt(0).toUpperCase() + member.type.slice(1);

  return (
    <div>
      <DetailHeader
        back={{
          href: `/dashboard/clients/${client.id}`,
          label: householdName(client),
        }}
        title={`${member.first_name} ${member.last_name ?? ""}`.trim()}
        chip={<Chip tone="neutral">{roleLabel}</Chip>}
      />
      <div className="mb-6" />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card title="Details">
            <dl className="flex flex-col gap-1.5 text-sm">
              {member.date_of_birth ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Date of birth</dt>
                  <dd>{member.date_of_birth}</dd>
                </div>
              ) : null}
              {member.phone ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Phone</dt>
                  <dd>{member.phone}</dd>
                </div>
              ) : null}
              {member.email ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Email</dt>
                  <dd className="truncate">{member.email}</dd>
                </div>
              ) : null}
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-3">
                  <dt className="text-muted">{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
              {member.notes ? <p className="mt-1 text-ink">{member.notes}</p> : null}
              {!member.date_of_birth && !member.phone && !member.email && !facts.length && !member.notes ? (
                <Empty>No details recorded yet.</Empty>
              ) : null}
            </dl>
          </Card>

          <Card title="Activity">
            {activity.length ? (
              <ul className="flex flex-col">
                {activity.map((a) => (
                  <li key={a.id} className="border-b border-hairline py-1.5 text-xs last:border-0">
                    {a.description}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No activity for this person yet.</Empty>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Important dates">
            {lifecycle.length ? (
              <ul className="flex flex-col gap-1.5 text-xs">
                {lifecycle.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-deep" />
                    <span>{d.item}</span>
                    <span className="ml-auto text-muted">{d.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No dates for this person yet.</Empty>
            )}
          </Card>

          <Card title="Open tasks">
            {tasks.length ? (
              <ul className="flex flex-col gap-1.5 text-xs">
                {tasks.map((t) => (
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
              <Empty>No open tasks for this person.</Empty>
            )}
          </Card>
        </div>
      </div>

      <HouseholdThreads
        clientId={id}
        familyMemberId={memberId}
        client={{ first_name: client.first_name, last_name: client.last_name }}
      />
    </div>
  );
}
