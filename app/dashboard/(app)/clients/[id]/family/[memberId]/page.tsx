import Link from "next/link";
import { notFound } from "next/navigation";

import { ageFromDob } from "@/lib/clients/dates";
import { jsonbToFacts } from "@/lib/clients/preferences";
import { getFamilyMember, householdName } from "@/lib/clients/queries";

import { Card, Empty } from "../../../_components/ui";

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
      <Link
        href={`/dashboard/clients/${client.id}`}
        className="text-xs text-[#8A857B] hover:underline"
      >
        ← {householdName(client)}
      </Link>

      <h1 className="mt-2 font-serif text-2xl">
        {member.first_name} {member.last_name ?? ""}
      </h1>
      <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A39E94]">
        {roleLabel}
      </p>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card title="Details">
            <dl className="flex flex-col gap-1.5 text-[13px]">
              {member.date_of_birth ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8A857B]">Date of birth</dt>
                  <dd>{member.date_of_birth}</dd>
                </div>
              ) : null}
              {member.phone ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8A857B]">Phone</dt>
                  <dd>{member.phone}</dd>
                </div>
              ) : null}
              {member.email ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8A857B]">Email</dt>
                  <dd className="truncate">{member.email}</dd>
                </div>
              ) : null}
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-3">
                  <dt className="text-[#8A857B]">{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
              {member.notes ? <p className="mt-1 text-[#3A372F]">{member.notes}</p> : null}
              {!member.date_of_birth && !member.phone && !member.email && !facts.length && !member.notes ? (
                <Empty>No details recorded yet.</Empty>
              ) : null}
            </dl>
          </Card>

          <Card title="Activity">
            {activity.length ? (
              <ul className="flex flex-col">
                {activity.map((a) => (
                  <li key={a.id} className="border-b border-[#F1EDE6] py-1.5 text-[12px] last:border-0">
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
              <ul className="flex flex-col gap-1.5 text-[12px]">
                {lifecycle.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A8B2A1]" />
                    <span>{d.item}</span>
                    <span className="ml-auto text-[#A39E94]">{d.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No dates for this person yet.</Empty>
            )}
          </Card>

          <Card title="Open tasks">
            {tasks.length ? (
              <ul className="flex flex-col gap-1.5 text-[12px]">
                {tasks.map((t) => (
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
              <Empty>No open tasks for this person.</Empty>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
