# Clients, Family & Calendar — Implementation Plan (Plan 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the dashboard rebuild — the Clients list, the client (household) page ("everything from discovery"), first-class family-member pages, and the Calendar aggregating `lifecycle_dates` + derived birthdays across all clients.

**Architecture:** Server Components fetch from Supabase via a `lib/clients` data layer; pure, unit-tested helpers handle date logic (next birthday, upcoming-date aggregation) and schema-tolerant JSONB rendering. The household and person pages reuse small presentational components. No new mutations in this plan (read/display only), so no new Server Actions or realtime.

**Tech Stack:** Next.js 16.2.2 (App Router, async params), React 19, Tailwind v4, Supabase (`@supabase/ssr`), Vitest.

---

## Context from Plans 1 & 2 (already built — do not recreate)

- `lib/supabase/server.ts` → `async createClient()`; `lib/supabase/types.ts` → `Database`.
- `proxy.ts` gates `/dashboard/*`. Shell + sidebar exist; `clients` and `calendar` are placeholder pages to REPLACE.
- Vitest set up (`npm test`, config includes `lib/**/*.test.ts`).
- Warm Admin palette: canvas `#F7F5F2`, sidebar `#EFEBE4`, card border `#E4DFD6`/`#E7E2D9`, sage `#A8B2A1`, charcoal `#1F1F1F`, muted `#8A857B`/`#6B665D`/`#A39E94`, urgent red `#C0392B`, hover bg `#FBFAF8`. `font-serif` = Playfair (400/600). Double quotes; `@/*` → root.

## Data facts (verified against the live DB)

- **`clients`**: `first_name`, `last_name`, `preferred_name`, `email`, `phone_whatsapp|imessage|sms`, `preferred_channel`, `address_home` (jsonb e.g. `{city,country}` or null), `status`, `budget_sensitivity`, `communication_style`, and heterogeneous JSONB prefs: `travel_preferences`, `restaurant_preferences`, `dietary_requirements`, `gift_preferences` (shapes vary; some null).
- **`family_members`** (7 rows): `type` (partner/child/dependent/pet/staff/contact), `first_name`, `last_name`, `date_of_birth` (set for children only), `email`, `phone`, `notes`, `details` (jsonb: school/breed/vet/etc.). FK `client_id`.
- **`lifecycle_dates`** (5 rows): `item`, `date`, `category` (insurance/vehicle/household/personal/family/subscription/education/health), `trigger_days_before`, `recurring`, `client_id`, `family_member_id` (currently all null). One row is "Olivia's birthday" (category family) — birthdays are ALSO derivable from `family_members.date_of_birth`, so the calendar must avoid duplicating them.
- **`activity_log`**: `activity_type`, `description`, `created_at`, `client_id`, `family_member_id`.
- **`tasks`**: pending tasks per client/member power the "open tasks" counts and lists.

## Design decisions

- **Birthdays come from `family_members.date_of_birth`** (computed next occurrence). To avoid duplicating the manual "Olivia's birthday" lifecycle row, the date aggregation **excludes `lifecycle_dates` whose `item` contains "birthday"** (case-insensitive) and derives birthdays from family members instead.
- **"Upcoming" = date on/after today.** Past lifecycle dates are hidden from the upcoming lists/calendar.
- **Heterogeneous prefs** render via a generic `jsonbToFacts` (humanised keys, arrays joined) — same approach as the triage `ai_brief` renderer.
- Currently no `lifecycle_dates`/`tasks`/`activity` are linked to a specific `family_member_id`, so person pages will mostly show empty states — that's expected and correct; they populate as Meg uses the system.

## File Structure

- Create: `lib/clients/dates.ts` + `lib/clients/dates.test.ts` — `nextBirthday`, `ageFromDob`, `buildDateEntries` (TDD)
- Create: `lib/clients/preferences.ts` + `lib/clients/preferences.test.ts` — `jsonbToFacts` (TDD)
- Create: `lib/clients/queries.ts` — `getClients`, `getClient`, `getFamilyMember` + types
- Create: `lib/clients/calendar.ts` — `getCalendarEntries`
- Create: `app/dashboard/(app)/clients/_components/ui.tsx` — `Card`, `SectionLabel`, `FACT_*` shared bits
- Modify: `app/dashboard/(app)/clients/page.tsx` — list (replace placeholder)
- Create: `app/dashboard/(app)/clients/[id]/page.tsx` — household
- Create: `app/dashboard/(app)/clients/[id]/family/[memberId]/page.tsx` — person
- Modify: `app/dashboard/(app)/calendar/page.tsx` — calendar (replace placeholder)

---

### Task 1: Date helpers (TDD)

**Files:** Create `lib/clients/dates.test.ts`, then `lib/clients/dates.ts`.

- [ ] **Step 1: Write failing tests** `lib/clients/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ageFromDob, buildDateEntries, nextBirthday } from "./dates";

const FROM = new Date("2026-06-17T00:00:00Z");

describe("nextBirthday", () => {
  it("returns this year's date when still upcoming", () => {
    // Olivia 2017-03-12 -> already passed in 2026, so next is 2027-03-12
    expect(nextBirthday("2017-03-12", FROM).toISOString().slice(0, 10)).toBe("2027-03-12");
  });
  it("returns later-this-year date when still ahead", () => {
    expect(nextBirthday("2020-09-01", FROM).toISOString().slice(0, 10)).toBe("2026-09-01");
  });
});

describe("ageFromDob", () => {
  it("computes age, accounting for whether the birthday has passed", () => {
    expect(ageFromDob("2017-03-12", FROM)).toBe(9); // birthday passed in 2026
    expect(ageFromDob("2020-09-01", FROM)).toBe(5); // birthday not yet reached
  });
});

describe("buildDateEntries", () => {
  it("merges upcoming lifecycle dates with derived birthdays, excludes birthday lifecycle rows and past dates, sorted ascending", () => {
    const lifecycle = [
      { id: "L1", item: "Car insurance renewal", date: "2026-08-01", category: "insurance", client_id: "c1", family_member_id: null },
      { id: "L2", item: "Olivia's birthday", date: "2027-03-12", category: "family", client_id: "c1", family_member_id: null },
      { id: "L3", item: "Old MOT", date: "2025-01-01", category: "vehicle", client_id: "c1", family_member_id: null },
    ];
    const members = [
      { id: "M1", first_name: "Olivia", date_of_birth: "2017-03-12", client_id: "c1" },
      { id: "M2", first_name: "Sophie", date_of_birth: null, client_id: "c1" },
    ];
    const entries = buildDateEntries(lifecycle, members, "The Harringtons", FROM);

    // L3 (past) excluded; L2 (birthday) excluded; M2 (no dob) excluded.
    expect(entries.map((e) => e.label)).toEqual([
      "Car insurance renewal",
      "Olivia's birthday",
    ]);
    expect(entries[1].category).toBe("birthday");
    expect(entries[1].memberId).toBe("M1");
    expect(entries[0].clientName).toBe("The Harringtons");
    expect(entries[1].date).toBe("2027-03-12");
  });
});
```

- [ ] **Step 2: Run `npm test`, confirm FAIL.**

- [ ] **Step 3: Implement `lib/clients/dates.ts`:**

```ts
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

// Next occurrence (this year if still ahead, else next year) of a dob's month/day.
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

// Upcoming lifecycle dates (excluding birthdays) merged with derived family birthdays.
export function buildDateEntries(
  lifecycle: LifecycleRow[],
  members: MemberRow[],
  clientName: string,
  from: Date = new Date(),
): DateEntry[] {
  const floorIso = dateOnlyUTC(from).toISOString().slice(0, 10);
  const entries: DateEntry[] = [];

  for (const row of lifecycle) {
    if (row.item.toLowerCase().includes("birthday")) continue; // birthdays come from members
    if (row.date < floorIso) continue; // past
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
```

- [ ] **Step 4: Run `npm test`, confirm PASS.**
- [ ] **Step 5: Commit** — `git add lib/clients/dates.ts lib/clients/dates.test.ts && git commit -m "feat: add client date helpers with tests"`

---

### Task 2: Preference helper (TDD)

**Files:** Create `lib/clients/preferences.test.ts`, then `lib/clients/preferences.ts`.

- [ ] **Step 1: Write failing tests** `lib/clients/preferences.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { jsonbToFacts } from "./preferences";

describe("jsonbToFacts", () => {
  it("returns [] for null/non-object", () => {
    expect(jsonbToFacts(null)).toEqual([]);
    expect(jsonbToFacts("x")).toEqual([]);
  });
  it("humanises keys and joins array values", () => {
    const facts = jsonbToFacts({ hotel_style: "boutique", cuisines: ["Italian", "Japanese"] });
    expect(facts).toContainEqual({ label: "Hotel style", value: "boutique" });
    expect(facts).toContainEqual({ label: "Cuisines", value: "Italian, Japanese" });
  });
  it("skips empty values", () => {
    expect(jsonbToFacts({ a: "", b: null, c: "ok" })).toEqual([{ label: "C", value: "ok" }]);
  });
});
```

- [ ] **Step 2: Run `npm test`, confirm FAIL.**

- [ ] **Step 3: Implement `lib/clients/preferences.ts`:**

```ts
export type Fact = { label: string; value: string };

function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Renders an arbitrary JSONB object as humanised label/value facts.
export function jsonbToFacts(value: unknown): Fact[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const facts: Fact[] = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const text = Array.isArray(raw)
      ? raw.map((v) => String(v)).join(", ")
      : raw === null || raw === undefined
        ? ""
        : typeof raw === "object"
          ? JSON.stringify(raw)
          : String(raw);
    if (text !== "") facts.push({ label: humanize(key), value: text });
  }
  return facts;
}
```

- [ ] **Step 4: Run `npm test`, confirm PASS.**
- [ ] **Step 5: Commit** — `git add lib/clients/preferences.ts lib/clients/preferences.test.ts && git commit -m "feat: add jsonbToFacts preference helper with tests"`

---

### Task 3: Client queries

**Files:** Create `lib/clients/queries.ts`.

- [ ] **Step 1: Create `lib/clients/queries.ts`:**

```ts
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type FamilyMemberRow = Database["public"]["Tables"]["family_members"]["Row"];
type LifecycleRow = Database["public"]["Tables"]["lifecycle_dates"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activity_log"]["Row"];

export type ClientSummary = ClientRow & { memberCount: number; openTaskCount: number };

export function householdName(client: Pick<ClientRow, "first_name" | "last_name">): string {
  return `The ${client.last_name} Household`;
}

export async function getClients(): Promise<ClientSummary[]> {
  const supabase = await createClient();
  const [clientsRes, membersRes, pendingRes] = await Promise.all([
    supabase.from("clients").select("*").order("last_name"),
    supabase.from("family_members").select("client_id"),
    supabase.from("tasks").select("client_id").eq("status", "pending"),
  ]);

  if (clientsRes.error) throw new Error(`Failed to load clients: ${clientsRes.error.message}`);

  const memberCounts = new Map<string, number>();
  for (const m of membersRes.data ?? []) {
    if (m.client_id) memberCounts.set(m.client_id, (memberCounts.get(m.client_id) ?? 0) + 1);
  }
  const taskCounts = new Map<string, number>();
  for (const t of pendingRes.data ?? []) {
    if (t.client_id) taskCounts.set(t.client_id, (taskCounts.get(t.client_id) ?? 0) + 1);
  }

  return (clientsRes.data ?? []).map((c) => ({
    ...c,
    memberCount: memberCounts.get(c.id) ?? 0,
    openTaskCount: taskCounts.get(c.id) ?? 0,
  }));
}

export type ClientDetail = {
  client: ClientRow;
  members: FamilyMemberRow[];
  lifecycle: LifecycleRow[];
  openTasks: TaskRow[];
  activity: ActivityRow[];
};

export async function getClient(id: string): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const [clientRes, membersRes, datesRes, tasksRes, activityRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("family_members").select("*").eq("client_id", id).order("type"),
    supabase.from("lifecycle_dates").select("*").eq("client_id", id),
    supabase.from("tasks").select("*").eq("client_id", id).eq("status", "pending"),
    supabase
      .from("activity_log")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (!clientRes.data) return null;

  return {
    client: clientRes.data,
    members: membersRes.data ?? [],
    lifecycle: datesRes.data ?? [],
    openTasks: tasksRes.data ?? [],
    activity: activityRes.data ?? [],
  };
}

export type FamilyMemberDetail = {
  client: Pick<ClientRow, "id" | "first_name" | "last_name">;
  member: FamilyMemberRow;
  lifecycle: LifecycleRow[];
  tasks: TaskRow[];
  activity: ActivityRow[];
};

export async function getFamilyMember(
  clientId: string,
  memberId: string,
): Promise<FamilyMemberDetail | null> {
  const supabase = await createClient();
  const memberRes = await supabase
    .from("family_members")
    .select("*")
    .eq("id", memberId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!memberRes.data) return null;

  const [clientRes, datesRes, tasksRes, activityRes] = await Promise.all([
    supabase.from("clients").select("id, first_name, last_name").eq("id", clientId).maybeSingle(),
    supabase.from("lifecycle_dates").select("*").eq("family_member_id", memberId),
    supabase.from("tasks").select("*").eq("family_member_id", memberId).eq("status", "pending"),
    supabase
      .from("activity_log")
      .select("*")
      .eq("family_member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (!clientRes.data) return null;

  return {
    client: clientRes.data,
    member: memberRes.data,
    lifecycle: datesRes.data ?? [],
    tasks: tasksRes.data ?? [],
    activity: activityRes.data ?? [],
  };
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add lib/clients/queries.ts && git commit -m "feat: add client and family-member queries"`

---

### Task 4: Calendar data

**Files:** Create `lib/clients/calendar.ts`.

- [ ] **Step 1: Create `lib/clients/calendar.ts`:**

```ts
import { createClient } from "@/lib/supabase/server";

import { buildDateEntries, type DateEntry } from "./dates";

// All upcoming dates across every client: lifecycle dates (minus birthdays) + derived birthdays.
export async function getCalendarEntries(from: Date = new Date()): Promise<DateEntry[]> {
  const supabase = await createClient();
  const [clientsRes, lifecycleRes, membersRes] = await Promise.all([
    supabase.from("clients").select("id, last_name"),
    supabase.from("lifecycle_dates").select("id, item, date, category, client_id, family_member_id"),
    supabase.from("family_members").select("id, first_name, date_of_birth, client_id"),
  ]);

  if (clientsRes.error) throw new Error(`Failed to load calendar: ${clientsRes.error.message}`);

  const nameByClient = new Map<string, string>();
  for (const c of clientsRes.data ?? []) {
    nameByClient.set(c.id, `The ${c.last_name} Household`);
  }

  const lifecycle = lifecycleRes.data ?? [];
  const members = membersRes.data ?? [];
  const entries: DateEntry[] = [];

  // Group per client so each client's name is attached, reusing buildDateEntries.
  for (const [clientId, name] of nameByClient) {
    const clientLifecycle = lifecycle.filter((l) => l.client_id === clientId);
    const clientMembers = members.filter((m) => m.client_id === clientId);
    entries.push(...buildDateEntries(clientLifecycle, clientMembers, name, from));
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add lib/clients/calendar.ts && git commit -m "feat: add calendar aggregation"`

---

### Task 5: Shared UI bits

**Files:** Create `app/dashboard/(app)/clients/_components/ui.tsx`.

- [ ] **Step 1: Create `app/dashboard/(app)/clients/_components/ui.tsx`:**

```tsx
export const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A766E] mb-3";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[10px] border border-[#E7E2D9] bg-white px-4 py-3.5 ${className}`}>
      {title ? <h3 className={SECTION_LABEL}>{title}</h3> : null}
      {children}
    </div>
  );
}

export function Chip({ children, sage = false }: { children: React.ReactNode; sage?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] tracking-[0.03em] ${
        sage ? "bg-[#A8B2A1] text-[#1F1F1F]" : "border border-[#D8D2C8] bg-white text-[#6B665D]"
      }`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[#A39E94]">{children}</p>;
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/clients/_components/ui.tsx" && git commit -m "feat: add shared client UI components"`

---

### Task 6: Clients list page

**Files:** Modify (replace placeholder) `app/dashboard/(app)/clients/page.tsx`.

- [ ] **Step 1: Replace `app/dashboard/(app)/clients/page.tsx`:**

```tsx
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
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/clients/page.tsx" && git commit -m "feat: add clients list page"`

---

### Task 7: Household (client) page

**Files:** Create `app/dashboard/(app)/clients/[id]/page.tsx`.

- [ ] **Step 1: Create `app/dashboard/(app)/clients/[id]/page.tsx`:**

Header + chips; two-column body matching the agreed mockup (left: Family & household, Household preferences, Recent activity; right: Main Contact, Upcoming dates, Open tasks). `params` is async (Next 16). Missing client → `notFound()`.

```tsx
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
```

- [ ] **Step 2: Typecheck + lint** — `npx tsc --noEmit` and `npm run lint` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/clients/[id]/page.tsx" && git commit -m "feat: add household client page"`

---

### Task 8: Family-member page

**Files:** Create `app/dashboard/(app)/clients/[id]/family/[memberId]/page.tsx`.

- [ ] **Step 1: Create `app/dashboard/(app)/clients/[id]/family/[memberId]/page.tsx`:**

```tsx
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
```

- [ ] **Step 2: Typecheck + lint** — `npx tsc --noEmit` and `npm run lint` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/clients/[id]/family" && git commit -m "feat: add family-member page"`

---

### Task 9: Calendar page

**Files:** Modify (replace placeholder) `app/dashboard/(app)/calendar/page.tsx`.

- [ ] **Step 1: Replace `app/dashboard/(app)/calendar/page.tsx`:**

```tsx
import Link from "next/link";

import { getCalendarEntries } from "@/lib/clients/calendar";

const CATEGORY_COLOR: Record<string, string> = {
  birthday: "#A8B2A1",
  insurance: "#C0392B",
  household: "#C97A5B",
};

export default async function CalendarPage() {
  const entries = await getCalendarEntries();

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Calendar</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        {entries.length} upcoming {entries.length === 1 ? "date" : "dates"} across all clients
      </p>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-[#E4DFD6] bg-white px-6 py-12 text-center text-sm text-[#8A857B]">
          Nothing upcoming.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-[#E7E2D9] bg-white px-4 py-3"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR[e.category] ?? "#A8B2A1" }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{e.label}</div>
                <Link href={`/dashboard/clients/${e.clientId}`} className="text-xs text-[#8A857B] hover:underline">
                  {e.clientName}
                </Link>
              </div>
              <span className="shrink-0 text-xs text-[#A39E94]">{e.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint** — `npx tsc --noEmit` and `npm run lint` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/calendar/page.tsx" && git commit -m "feat: add calendar page"`

---

### Task 10: End-to-end verification

Use the preview tools; sign in if prompted (Plan 1 user).

- [ ] **Step 1: Unit tests** — `npm test`. Expect dates + preferences suites green alongside the existing triage suites.
- [ ] **Step 2: Clients list** — open `/dashboard/clients`. Expect 3 household cards (The Harrington / Shaw / Chen Household) with member + open-task counts.
- [ ] **Step 3: Household page** — click The Harrington Household. Expect: header chips (active, 3 family, open-task count); family cards (Sophie/Olivia/Monty) with Olivia showing "Child · 9"; Household preferences (Travel, Dining, Comms); Main contact (WhatsApp + email); Upcoming dates (Car insurance renewal, Olivia's birthday — once, not duplicated); Recent activity.
- [ ] **Step 4: Family member** — click Olivia. Expect her page: role "Child · 9", Details with Date of birth + School (St Mary's Prep), empty states for dates/tasks/activity, and the "← The Harrington Household" back link works.
- [ ] **Step 5: Pet** — from a household with a pet (Harrington → Monty), open Monty: Details show Species/Breed/Vet from `details`.
- [ ] **Step 6: Calendar** — open `/dashboard/calendar`. Expect a sorted list across clients including birthdays (Olivia/Freddie/Isla) and renewals (car/home insurance, boiler, passport), with **no duplicate** Olivia's birthday, each linking to its household.
- [ ] **Step 7: Not found** — visit `/dashboard/clients/00000000-0000-0000-0000-000000000000`. Expect the Next not-found page (not a crash).
- [ ] **Step 8: Console + lint** — `preview_console_logs` clean; `npm run lint` clean.
- [ ] **Step 9: Screenshot** the household page for the record.

---

## Done When

- Clients list, household page, family-member pages, and Calendar all render the real migrated data.
- Family cards link to per-person pages; the back link returns to the household.
- Olivia's birthday appears exactly once on the calendar (no lifecycle/derived duplication); ages compute correctly.
- Heterogeneous preference JSONB renders without breaking; empty sections show graceful empty states.
- `npm test`, `npx tsc --noEmit`, and `npm run lint` all pass.

## After this plan

The dashboard rebuild is feature-complete (Triage, Clients, Family, Calendar; Leads/Finances/Agents stubbed). Follow-ups to consider: merge `dashboard-rebuild`, rotate the temporary login password, drop the deprecated `clients` JSON/partner columns, and add realtime to activity feeds.
