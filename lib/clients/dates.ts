export type DateEntry = {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD
  category: string;
  clientId: string;
  clientName: string;
  memberId?: string;
};

type LifecycleRow = {
  id: string;
  item: string;
  date: string;
  category: string | null;
  client_id: string | null;
  family_member_id: string | null;
};

type MemberRow = {
  id: string;
  first_name: string;
  date_of_birth: string | null;
  client_id: string | null;
};

function dateOnlyUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function nextBirthday(dobIso: string, from: Date = new Date()): Date {
  const dob = new Date(dobIso);
  const month = dob.getUTCMonth();
  const day = dob.getUTCDate();
  const floor = dateOnlyUTC(from);
  let candidate = new Date(Date.UTC(from.getUTCFullYear(), month, day));
  if (candidate < floor) {
    candidate = new Date(Date.UTC(from.getUTCFullYear() + 1, month, day));
  }
  return candidate;
}

export function ageFromDob(dobIso: string, from: Date = new Date()): number {
  const dob = new Date(dobIso);
  let age = from.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = from.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && from.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
}

export function buildDateEntries(
  lifecycle: LifecycleRow[],
  members: MemberRow[],
  clientName: string,
  from: Date = new Date(),
): DateEntry[] {
  const floorIso = dateOnlyUTC(from).toISOString().slice(0, 10);
  const entries: DateEntry[] = [];

  for (const row of lifecycle) {
    if (row.item.toLowerCase().includes("birthday")) continue;
    if (row.date < floorIso) continue;
    entries.push({
      id: `l-${row.id}`,
      label: row.item,
      date: row.date,
      category: row.category ?? "other",
      clientId: row.client_id ?? "",
      clientName,
      memberId: row.family_member_id ?? undefined,
    });
  }

  for (const m of members) {
    if (!m.date_of_birth) continue;
    entries.push({
      id: `b-${m.id}`,
      label: `${m.first_name}'s birthday`,
      date: nextBirthday(m.date_of_birth, from).toISOString().slice(0, 10),
      category: "birthday",
      clientId: m.client_id ?? "",
      clientName,
      memberId: m.id,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}
