# Triage Inbox — Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Triage inbox — the dashboard centrepiece. A live list of pending tasks, a schema-tolerant task-detail card that renders the heterogeneous `ai_brief`, and the decision actions (Approve / Edit & Approve / Dismiss / Snooze / Note) that write back to `tasks` and `activity_log`. Also add the **Leads** nav stub.

**Architecture:** A Server Component fetches the inbox (tasks joined to client + family member) and renders a two-pane list + detail, selection driven by a `?task=<id>` search param. A small client component subscribes to Supabase Realtime on `tasks` and calls `router.refresh()` so new/changed tasks appear live. Decisions are Server Actions that update the row, write an `activity_log` entry, and redirect back to the inbox. The `ai_brief` rendering logic lives in a pure, unit-tested module so the UI stays dumb.

**Tech Stack:** Next.js 16.2.2 (App Router, async APIs, Server Actions), React 19, Tailwind v4, Supabase (`@supabase/ssr`, Realtime), Vitest (new — for the pure logic).

---

## Context from Plan 1 (already built — do not recreate)

- `lib/supabase/server.ts` → `async createClient()` (Server Components/Actions).
- `lib/supabase/client.ts` → `createClient()` (browser; use for Realtime).
- `lib/supabase/types.ts` → generated `Database` type.
- `proxy.ts` gates `/dashboard/*`; pages need no auth guard.
- Dashboard shell at `app/dashboard/(app)/layout.tsx` + `_components/Sidebar.tsx`.
- Brand palette (Warm Admin): canvas `#F7F5F2`, sidebar `#EFEBE4`, divider `#D8D2C8`, cards white w/ `#E7E2D9` border, charcoal `#1F1F1F`, sage `#A8B2A1`, muted text `#8A857B`/`#6B665D`. `font-serif` = Playfair, weights 400/600. Double quotes; `@/*` → project root.

## Data facts (verified against the live DB)

- `tasks` columns include: `status` (`pending|approved|dismissed|snoozed|executing|completed`), `urgency` (`normal|urgent`), `source` (`reactive|proactive`), `request_type`, `request_summary`, `raw_message`, `ai_brief` (jsonb), `draft_message`, `draft_channel`, `meg_edited_message`, `meg_notes`, `dismissed_reason`, `snoozed_until`, `approved_at`, `client_id`, `family_member_id`, `created_at`.
- `activity_log.activity_type` allowed values: `message_received, message_sent, task_created, task_approved, task_dismissed, task_snoozed, proactive_trigger, profile_updated, lifecycle_actioned`. **There is NO note type** — the Note action updates `meg_notes` only, no activity row.
- `tasks` is NOT yet in the `supabase_realtime` publication (Task 2 fixes this).
- **`ai_brief` is heterogeneous.** The four real shapes today:
  - renewal: `{ date, trigger, current_provider, last_known_premium, suggested_action }`
  - childcare: `{ holiday, dates, trigger, children: [..], existing_arrangements, suggested_action }`
  - research: `{ options: [{ name, summary, estimated_cost }], recommendation }`
  - travel: `{ options: [{ name, summary, estimated_cost, why }], recommendation, recommendation_reasoning, notes_for_meg }`
  - `recommendation` is **1-indexed** into `options` (`1` = first option).

## File Structure

- Modify: `app/dashboard/(app)/_components/Sidebar.tsx` — add Leads nav item
- Create: `app/dashboard/(app)/leads/page.tsx` — stub
- Create: `vitest.config.ts`; Modify: `package.json` — test deps + script
- Create: `lib/triage/ai-brief.ts` + `lib/triage/ai-brief.test.ts` — pure normalizer (TDD)
- Create: `lib/triage/format.ts` + `lib/triage/format.test.ts` — `formatGBP`, `timeAgo`
- Create: `lib/triage/queries.ts` — `getInboxTasks()` + `InboxTask` type
- Create: `app/dashboard/(app)/triage/actions.ts` — the five decision actions
- Create: `app/dashboard/(app)/triage/_components/TaskCard.tsx` — detail (server)
- Create: `app/dashboard/(app)/triage/_components/TaskActions.tsx` — decision UI (client)
- Create: `app/dashboard/(app)/triage/_components/RealtimeTasks.tsx` — realtime (client)
- Modify: `app/dashboard/(app)/triage/page.tsx` — replace placeholder with the inbox

---

### Task 1: Add Leads nav stub

**Files:**
- Modify: `app/dashboard/(app)/_components/Sidebar.tsx`
- Create: `app/dashboard/(app)/leads/page.tsx`

- [ ] **Step 1: Add Leads to the nav array** in `Sidebar.tsx`. Change the `NAV` constant to (Leads sits after Clients):

```tsx
const NAV = [
  { href: "/dashboard/triage", label: "Triage" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/finances", label: "Finances" },
  { href: "/dashboard/agents", label: "Agents" },
];
```

- [ ] **Step 2: Create `app/dashboard/(app)/leads/page.tsx`**

```tsx
export default function LeadsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-2">Leads</h1>
      <p className="text-sm text-[#8A857B]">
        Prospective clients surfaced by the lead-finding agent will appear here —
        designed in a later cycle.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 4: Commit** — `git add "app/dashboard/(app)/_components/Sidebar.tsx" "app/dashboard/(app)/leads" && git commit -m "feat: add Leads nav stub"`

---

### Task 2: Enable Realtime for `tasks`

**Files:** Supabase migration (apply via Supabase MCP `apply_migration`, name `enable_realtime_tasks`).

- [ ] **Step 1: Apply** — add `tasks` to the realtime publication and set full replica identity so UPDATE payloads carry all columns (needed for RLS-checked realtime):

```sql
alter publication supabase_realtime add table public.tasks;
alter table public.tasks replica identity full;
```

- [ ] **Step 2: Verify** (Supabase MCP `execute_sql`):

```sql
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks';
```
Expected: one row, `tasks`.

---

### Task 3: Vitest setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Add the test script** to `package.json` `"scripts"` (add this line alongside the existing scripts):

```json
    "test": "vitest run",
```

- [ ] **Step 3: Create `vitest.config.ts`** (node environment — the tested code is pure TS, no DOM):

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Verify the runner works** — `npm test`. Expected: exits 0 with "No test files found" (no tests yet) OR runs zero tests cleanly. (If it errors that no files match, that's fine for now — the next task adds tests.)

- [ ] **Step 5: Commit** — `git add package.json package-lock.json vitest.config.ts && git commit -m "chore: add vitest for unit tests"`

---

### Task 4: `ai_brief` normalizer (TDD)

This is the schema-tolerant core. Write the tests first.

**Files:**
- Create: `lib/triage/ai-brief.test.ts`
- Create: `lib/triage/ai-brief.ts`

- [ ] **Step 1: Write the failing tests** `lib/triage/ai-brief.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { normalizeAiBrief } from "./ai-brief";

describe("normalizeAiBrief", () => {
  it("returns empty structure for null/non-object input", () => {
    expect(normalizeAiBrief(null)).toEqual({ facts: [], options: [] });
    expect(normalizeAiBrief("nope")).toEqual({ facts: [], options: [] });
  });

  it("renders proactive renewal context as facts (no options)", () => {
    const result = normalizeAiBrief({
      date: "2026-05-18",
      trigger: "car_insurance_renewal",
      current_provider: "Admiral",
      last_known_premium: 487,
      suggested_action: "Offer to review market or renew existing policy",
    });
    expect(result.options).toEqual([]);
    expect(result.facts).toContainEqual({ label: "Current provider", value: "Admiral" });
    expect(result.facts).toContainEqual({ label: "Trigger", value: "car_insurance_renewal" });
    expect(result.facts).toContainEqual({ label: "Last known premium", value: "487" });
  });

  it("joins array fact values (childcare children)", () => {
    const result = normalizeAiBrief({
      holiday: "May half term",
      children: ["Freddie (6)", "Isla (4)"],
    });
    expect(result.facts).toContainEqual({ label: "Children", value: "Freddie (6), Isla (4)" });
    expect(result.facts).toContainEqual({ label: "Holiday", value: "May half term" });
  });

  it("maps research options and flags the 1-indexed recommendation", () => {
    const result = normalizeAiBrief({
      options: [
        { name: "Porsche Taycan", summary: "Understated.", estimated_cost: 85000 },
        { name: "BMW i5", summary: "Subtle.", estimated_cost: 62000 },
      ],
      recommendation: 1,
    });
    expect(result.options).toHaveLength(2);
    expect(result.options[0]).toMatchObject({ name: "Porsche Taycan", cost: 85000, recommended: true });
    expect(result.options[1].recommended).toBe(false);
    // `options`/`recommendation` keys must NOT leak into facts
    expect(result.facts.find((f) => f.label.toLowerCase().includes("option"))).toBeUndefined();
  });

  it("captures travel reasoning, per-option why, and note for meg", () => {
    const result = normalizeAiBrief({
      options: [
        { name: "Morzine", summary: "Family-friendly.", estimated_cost: 8200, why: "Best ski school" },
        { name: "La Clusaz", summary: "Charming.", estimated_cost: 7800, why: "Authentic" },
      ],
      recommendation: 1,
      recommendation_reasoning: "Morzine is the best all-round.",
      notes_for_meg: "Dates unconfirmed.",
    });
    expect(result.options[0]).toMatchObject({ recommended: true, why: "Best ski school" });
    expect(result.recommendationReasoning).toBe("Morzine is the best all-round.");
    expect(result.noteForMeg).toBe("Dates unconfirmed.");
  });
});
```

- [ ] **Step 2: Run tests, verify they FAIL** — `npm test`. Expected: failures ("normalizeAiBrief is not a function" / module not found).

- [ ] **Step 3: Implement `lib/triage/ai-brief.ts`**

```ts
export type BriefOption = {
  name: string;
  summary?: string;
  cost?: number;
  why?: string;
  recommended: boolean;
};

export type NormalizedBrief = {
  facts: { label: string; value: string }[];
  options: BriefOption[];
  recommendationReasoning?: string;
  noteForMeg?: string;
};

// Keys handled specially — excluded from the generic "facts" list.
const RESERVED = new Set([
  "options",
  "recommendation",
  "recommendation_reasoning",
  "notes_for_meg",
]);

function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function toValue(raw: unknown): string {
  if (Array.isArray(raw)) return raw.map((v) => String(v)).join(", ");
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object") return JSON.stringify(raw);
  return String(raw);
}

export function normalizeAiBrief(brief: unknown): NormalizedBrief {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    return { facts: [], options: [] };
  }

  const b = brief as Record<string, unknown>;
  const result: NormalizedBrief = { facts: [], options: [] };

  // Options + 1-indexed recommendation
  if (Array.isArray(b.options)) {
    const recIndex = typeof b.recommendation === "number" ? b.recommendation : -1;
    result.options = b.options.map((opt, i) => {
      const o = (opt ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? ""),
        summary: o.summary != null ? String(o.summary) : undefined,
        cost: typeof o.estimated_cost === "number" ? o.estimated_cost : undefined,
        why: o.why != null ? String(o.why) : undefined,
        recommended: i + 1 === recIndex,
      };
    });
  }

  if (typeof b.recommendation_reasoning === "string") {
    result.recommendationReasoning = b.recommendation_reasoning;
  }
  if (typeof b.notes_for_meg === "string") {
    result.noteForMeg = b.notes_for_meg;
  }

  // Everything else → facts
  for (const [key, raw] of Object.entries(b)) {
    if (RESERVED.has(key)) continue;
    const value = toValue(raw);
    if (value !== "") result.facts.push({ label: humanize(key), value });
  }

  return result;
}
```

- [ ] **Step 4: Run tests, verify they PASS** — `npm test`. Expected: all green.
- [ ] **Step 5: Commit** — `git add lib/triage/ai-brief.ts lib/triage/ai-brief.test.ts && git commit -m "feat: add schema-tolerant ai_brief normalizer with tests"`

---

### Task 5: Format helpers (TDD)

**Files:**
- Create: `lib/triage/format.test.ts`
- Create: `lib/triage/format.ts`

- [ ] **Step 1: Write the failing tests** `lib/triage/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { formatGBP, timeAgo } from "./format";

describe("formatGBP", () => {
  it("formats whole pounds with thousands separators", () => {
    expect(formatGBP(8200)).toBe("£8,200");
    expect(formatGBP(487)).toBe("£487");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-17T12:00:00Z");
  it("returns 'just now' under a minute", () => {
    expect(timeAgo("2026-06-17T11:59:30Z", now)).toBe("just now");
  });
  it("returns minutes, hours, days", () => {
    expect(timeAgo("2026-06-17T11:30:00Z", now)).toBe("30m ago");
    expect(timeAgo("2026-06-17T09:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-06-15T12:00:00Z", now)).toBe("2d ago");
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL** — `npm test`.

- [ ] **Step 3: Implement `lib/triage/format.ts`**

```ts
export function formatGBP(amount: number): string {
  return `£${Math.round(amount).toLocaleString("en-GB")}`;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now.getTime() - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
```

- [ ] **Step 4: Run tests, verify PASS** — `npm test`.
- [ ] **Step 5: Commit** — `git add lib/triage/format.ts lib/triage/format.test.ts && git commit -m "feat: add formatGBP and timeAgo helpers with tests"`

---

### Task 6: Inbox query

**Files:** Create: `lib/triage/queries.ts`

- [ ] **Step 1: Create `lib/triage/queries.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export type InboxTask = TaskRow & {
  client: { first_name: string; last_name: string } | null;
  family_member: { first_name: string; last_name: string | null; type: string } | null;
};

// Pending tasks, plus snoozed tasks whose snooze has elapsed. Urgent first, then newest.
export async function getInboxTasks(): Promise<InboxTask[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, client:clients(first_name,last_name), family_member:family_members(first_name,last_name,type)",
    )
    .or(`status.eq.pending,and(status.eq.snoozed,snoozed_until.lte.${nowIso})`)
    .order("urgency", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load inbox: ${error.message}`);
  return (data ?? []) as InboxTask[];
}

// Display name for a task: the specific family member if linked, else the household.
export function taskTitle(task: InboxTask): string {
  if (task.family_member) {
    return [task.family_member.first_name, task.family_member.last_name]
      .filter(Boolean)
      .join(" ");
  }
  if (task.client) return `${task.client.first_name} ${task.client.last_name}`;
  return "Unknown";
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add lib/triage/queries.ts && git commit -m "feat: add triage inbox query"`

---

### Task 7: Decision Server Actions

**Files:** Create: `app/dashboard/(app)/triage/actions.ts`

- [ ] **Step 1: Create `app/dashboard/(app)/triage/actions.ts`**

Each action updates the task, writes an `activity_log` row where a valid type exists (Note has none), revalidates, and redirects back to the inbox.

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type ActivityType = "task_approved" | "task_dismissed" | "task_snoozed";

// Updates the task and (optionally) logs an activity entry for it.
async function updateTask(
  id: string,
  patch: Record<string, unknown>,
  activity?: { type: ActivityType; description: string },
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("client_id, family_member_id")
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);

  if (activity) {
    await supabase.from("activity_log").insert({
      task_id: id,
      client_id: data.client_id,
      family_member_id: data.family_member_id,
      activity_type: activity.type,
      description: activity.description,
    });
  }

  revalidatePath("/dashboard/triage");
}

export async function approveTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  await updateTask(
    id,
    { status: "approved", approved_at: new Date().toISOString() },
    { type: "task_approved", description: "Approved the agent's draft reply" },
  );
  redirect("/dashboard/triage");
}

export async function editApproveTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  const message = String(formData.get("message") ?? "");
  await updateTask(
    id,
    {
      status: "approved",
      approved_at: new Date().toISOString(),
      meg_edited_message: message,
    },
    { type: "task_approved", description: "Edited and approved the reply" },
  );
  redirect("/dashboard/triage");
}

export async function dismissTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  const reason = String(formData.get("reason") ?? "");
  await updateTask(
    id,
    { status: "dismissed", dismissed_reason: reason },
    { type: "task_dismissed", description: reason ? `Dismissed: ${reason}` : "Dismissed" },
  );
  redirect("/dashboard/triage");
}

export async function snoozeTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  const until = String(formData.get("until") ?? "");
  await updateTask(
    id,
    { status: "snoozed", snoozed_until: new Date(until).toISOString() },
    { type: "task_snoozed", description: `Snoozed until ${until}` },
  );
  redirect("/dashboard/triage");
}

// Note has no matching activity_log type — update meg_notes only.
export async function noteTask(formData: FormData) {
  const id = String(formData.get("taskId"));
  const note = String(formData.get("note") ?? "");
  await updateTask(id, { meg_notes: note });
  redirect("/dashboard/triage");
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/triage/actions.ts" && git commit -m "feat: add triage decision server actions"`

---

### Task 8: TaskActions (client decision UI)

**Files:** Create: `app/dashboard/(app)/triage/_components/TaskActions.tsx`

- [ ] **Step 1: Create `app/dashboard/(app)/triage/_components/TaskActions.tsx`**

A client component with one open panel at a time. Approve posts immediately; the others reveal a small form.

```tsx
"use client";

import { useState } from "react";

import {
  approveTask,
  dismissTask,
  editApproveTask,
  noteTask,
  snoozeTask,
} from "../actions";

type Panel = "none" | "edit" | "dismiss" | "snooze" | "note";

const BTN =
  "rounded-md border border-[#C9C2B5] bg-white px-4 py-2 text-sm hover:bg-[#FBFAF8] transition-colors";
const FIELD = "w-full border border-[#D8D2C8] rounded-md px-3 py-2 bg-white text-sm";

export function TaskActions({
  taskId,
  draftMessage,
  notes,
}: {
  taskId: string;
  draftMessage: string;
  notes: string | null;
}) {
  const [panel, setPanel] = useState<Panel>("none");

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2.5">
        <form action={approveTask}>
          <input type="hidden" name="taskId" value={taskId} />
          <button
            type="submit"
            className="rounded-md bg-[#A8B2A1] px-4 py-2 text-sm font-medium text-[#1F1F1F] hover:bg-[#96a08f] transition-colors"
          >
            Approve
          </button>
        </form>
        <button className={BTN} onClick={() => setPanel(panel === "edit" ? "none" : "edit")}>
          Edit &amp; Approve
        </button>
        <button className={BTN} onClick={() => setPanel(panel === "dismiss" ? "none" : "dismiss")}>
          Dismiss
        </button>
        <button className={BTN} onClick={() => setPanel(panel === "snooze" ? "none" : "snooze")}>
          Snooze
        </button>
        <button className={BTN} onClick={() => setPanel(panel === "note" ? "none" : "note")}>
          Note
        </button>
      </div>

      {panel === "edit" ? (
        <form action={editApproveTask} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <textarea name="message" rows={5} defaultValue={draftMessage} className={FIELD} />
          <button
            type="submit"
            className="self-start rounded-md bg-[#A8B2A1] px-4 py-2 text-sm font-medium text-[#1F1F1F] hover:bg-[#96a08f]"
          >
            Save &amp; Approve
          </button>
        </form>
      ) : null}

      {panel === "dismiss" ? (
        <form action={dismissTask} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <input name="reason" placeholder="Reason (optional)" className={FIELD} />
          <button type="submit" className={`${BTN} self-start`}>Confirm dismiss</button>
        </form>
      ) : null}

      {panel === "snooze" ? (
        <form action={snoozeTask} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="date" name="until" required className={`${FIELD} max-w-xs`} />
          <button type="submit" className={`${BTN} self-start`}>Confirm snooze</button>
        </form>
      ) : null}

      {panel === "note" ? (
        <form action={noteTask} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <textarea
            name="note"
            rows={3}
            defaultValue={notes ?? ""}
            placeholder="Private note for this task"
            className={FIELD}
          />
          <button type="submit" className={`${BTN} self-start`}>Save note</button>
        </form>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/triage/_components/TaskActions.tsx" && git commit -m "feat: add triage task decision UI"`

---

### Task 9: TaskCard (detail, server component)

**Files:** Create: `app/dashboard/(app)/triage/_components/TaskCard.tsx`

- [ ] **Step 1: Create `app/dashboard/(app)/triage/_components/TaskCard.tsx`**

Renders the canonical layout: header → AI Spotted (facts) → Research findings (options) → Recommendation/Note → Draft message → actions.

```tsx
import { normalizeAiBrief } from "@/lib/triage/ai-brief";
import { formatGBP, timeAgo } from "@/lib/triage/format";
import { taskTitle, type InboxTask } from "@/lib/triage/queries";

import { TaskActions } from "./TaskActions";

const LABEL = "text-[10px] tracking-[0.14em] uppercase text-[#A39E94]";

export function TaskCard({ task }: { task: InboxTask }) {
  const brief = normalizeAiBrief(task.ai_brief);
  const isProactive = task.source === "proactive";

  return (
    <div className="rounded-xl border border-[#E4DFD6] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.12em] ${
            isProactive
              ? "bg-[#A8B2A1] text-[#1F1F1F]"
              : "border border-[#C9C2B5] text-[#6B665D]"
          }`}
        >
          {(task.source ?? "").toUpperCase()}
        </span>
        {task.created_at ? (
          <span className="font-serif text-sm italic text-[#A39E94]">
            {timeAgo(task.created_at)}
          </span>
        ) : null}
      </div>

      <h2 className="font-serif text-2xl">{taskTitle(task)}</h2>
      <p className={`${LABEL} mt-1 mb-5`}>{task.request_type}</p>

      {task.raw_message ? (
        <div className="mb-5">
          <div className={LABEL}>Client&apos;s message</div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[#3A372F]">{task.raw_message}</p>
        </div>
      ) : null}

      <div className="mb-5 rounded-r-lg border-l-[3px] border-[#A8B2A1] bg-[#F7F5F2] px-4 py-3">
        <div className={LABEL}>{isProactive ? "AI Spotted" : "Brief"}</div>
        {task.request_summary ? (
          <p className="mt-1.5 text-[15px] leading-relaxed">{task.request_summary}</p>
        ) : null}
        {brief.facts.length ? (
          <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[13px]">
            {brief.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-[#A39E94]">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {brief.options.length ? (
        <div className="mb-5 overflow-hidden rounded-lg border border-[#E7E2D9]">
          <div className={`${LABEL} bg-[#F2EEE7] px-4 py-2`}>Research findings</div>
          {brief.options.map((o) => (
            <div
              key={o.name}
              className={`flex items-start gap-3 border-t border-[#EFEAE2] px-4 py-3 first:border-t-0 ${
                o.recommended ? "bg-[#FBFAF7]" : ""
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  o.recommended ? "bg-[#A8B2A1]" : "bg-[#D8D2C8]"
                }`}
              />
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{o.name}</div>
                {o.summary ? <div className="text-[12.5px] text-[#8A857B]">{o.summary}</div> : null}
                {o.why ? <div className="mt-0.5 text-[11px] italic text-[#A8B2A1]">{o.why}</div> : null}
              </div>
              <div className="whitespace-nowrap text-right text-[15px] font-semibold">
                {typeof o.cost === "number" ? formatGBP(o.cost) : ""}
                {o.recommended ? (
                  <span className="block text-[9px] font-semibold text-[#A8B2A1]">Recommended</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {brief.recommendationReasoning ? (
        <div className="mb-3 rounded-lg bg-[#F7F5F2] px-4 py-3">
          <div className={LABEL}>Recommendation</div>
          <p className="mt-1 text-[14px] leading-relaxed">{brief.recommendationReasoning}</p>
        </div>
      ) : null}
      {brief.noteForMeg ? (
        <p className="mb-5 text-[12.5px] italic text-[#8A857B]">Note for Meg: {brief.noteForMeg}</p>
      ) : null}

      {task.draft_message ? (
        <div className="rounded-lg border border-[#E4DFD6] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={LABEL}>Draft message</span>
            {task.draft_channel ? (
              <span className="rounded-full border border-[#C9C2B5] px-2.5 py-0.5 text-[10px] text-[#6B665D]">
                {task.draft_channel}
              </span>
            ) : null}
          </div>
          <p className="font-mono text-[13px] leading-relaxed text-[#3A372F] whitespace-pre-wrap">
            {task.meg_edited_message ?? task.draft_message}
          </p>
          <div className="mt-2 text-right text-[11px] text-[#B7B1A6]">
            {(task.meg_edited_message ?? task.draft_message).length} chars
          </div>
        </div>
      ) : null}

      <TaskActions
        taskId={task.id}
        draftMessage={task.meg_edited_message ?? task.draft_message ?? ""}
        notes={task.meg_notes}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/triage/_components/TaskCard.tsx" && git commit -m "feat: add triage task detail card"`

---

### Task 10: RealtimeTasks (live updates)

**Files:** Create: `app/dashboard/(app)/triage/_components/RealtimeTasks.tsx`

- [ ] **Step 1: Create `app/dashboard/(app)/triage/_components/RealtimeTasks.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Subscribes to task changes and re-fetches the server-rendered inbox when they occur.
export function RealtimeTasks() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("triage-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/triage/_components/RealtimeTasks.tsx" && git commit -m "feat: add realtime task subscription"`

---

### Task 11: Wire the Triage page

**Files:** Modify (replace placeholder): `app/dashboard/(app)/triage/page.tsx`

- [ ] **Step 1: Replace `app/dashboard/(app)/triage/page.tsx`**

Two-pane: a list of inbox tasks (links carrying `?task=<id>`) and the selected task's detail. Defaults to the first task. Includes the realtime subscriber and an empty state.

```tsx
import Link from "next/link";

import { getInboxTasks, taskTitle } from "@/lib/triage/queries";

import { RealtimeTasks } from "./_components/RealtimeTasks";
import { TaskCard } from "./_components/TaskCard";

export default async function TriagePage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: selectedId } = await searchParams;
  const tasks = await getInboxTasks();
  const selected = tasks.find((t) => t.id === selectedId) ?? tasks[0] ?? null;

  return (
    <div>
      <RealtimeTasks />
      <h1 className="font-serif text-2xl mb-1">Triage</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        {tasks.length} pending {tasks.length === 1 ? "task" : "tasks"}
      </p>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-[#E4DFD6] bg-white px-6 py-12 text-center text-sm text-[#8A857B]">
          Nothing to triage right now.
        </div>
      ) : (
        <div className="flex gap-6">
          <ul className="w-64 shrink-0 flex flex-col gap-2">
            {tasks.map((t) => {
              const active = selected?.id === t.id;
              return (
                <li key={t.id}>
                  <Link
                    href={`/dashboard/triage?task=${t.id}`}
                    className={`block rounded-lg border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-[#A8B2A1] bg-white"
                        : "border-[#E7E2D9] bg-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          t.urgency === "urgent" ? "bg-[#C0392B]" : "bg-[#A8B2A1]"
                        }`}
                      />
                      <span className="truncate text-sm font-medium">{taskTitle(t)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[#8A857B]">
                      {t.request_summary ?? t.request_type}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex-1">{selected ? <TaskCard task={selected} /> : null}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint** — `npx tsc --noEmit` and `npm run lint` (both clean).
- [ ] **Step 3: Commit** — `git add "app/dashboard/(app)/triage/page.tsx" && git commit -m "feat: wire triage inbox page with list, detail, realtime"`

---

### Task 12: End-to-end verification

Use the preview tools (dev server). Sign in with the existing user (Plan 1) if prompted.

- [ ] **Step 1: Run all unit tests** — `npm test`. Expected: ai-brief + format suites pass.
- [ ] **Step 2: Start dev server** (preview_start) and open `/dashboard/triage`.
- [ ] **Step 3: List renders** — expect 3 pending tasks (renewal, childcare, travel; the electric-car one is `completed` so excluded). Urgent ones (if any) sort first.
- [ ] **Step 4: Renewal task** — its card shows AI Spotted with facts (current provider Admiral, last known premium, trigger) and NO research-findings block; draft message with the WhatsApp pill + char count.
- [ ] **Step 5: Travel task** — click it; card shows the client's message (if `raw_message` is set), Research findings with Morzine/La Clusaz/Les Gets, Morzine flagged **Recommended** (1-indexed), each option's "why", the Recommendation reasoning, and the Note for Meg.
- [ ] **Step 6: Approve** — on any task, click Approve. Expect redirect to `/dashboard/triage`, the task gone from the list, and the pending count decremented. Verify in DB (execute_sql): that task's `status='approved'`, `approved_at` set, and a new `activity_log` row with `activity_type='task_approved'`.
- [ ] **Step 7: Edit & Approve** — on another task, click Edit & Approve, change the text, Save & Approve. Verify `meg_edited_message` saved and `status='approved'`.
- [ ] **Step 8: Dismiss + Snooze** — verify Dismiss sets `status='dismissed'` (+ reason) and Snooze sets `status='snoozed'` with a future `snoozed_until` (and the task leaves the inbox).
- [ ] **Step 9: Realtime** — with the page open, insert a test task via execute_sql:

```sql
insert into public.tasks (client_id, request_type, source, status, urgency, request_summary, draft_message, draft_channel)
select id, 'other', 'reactive', 'pending', 'urgent', 'Realtime test task', 'Test draft', 'email'
from public.clients limit 1;
```
Expect the new task to appear in the list WITHOUT a manual refresh. Then clean it up:
```sql
delete from public.tasks where request_summary = 'Realtime test task';
```

- [ ] **Step 10: Console + lint** — check `preview_console_logs` (no errors) and `npm run lint` (clean).
- [ ] **Step 11: Screenshot** the travel task detail for the record.

---

## Done When

- Triage shows the live pending list; selecting a task shows the correct detail.
- The `ai_brief` card renders both shapes correctly (facts-only and full options w/ recommendation), and won't break on an unknown field.
- Approve / Edit & Approve / Dismiss / Snooze / Note all mutate the row correctly and write the right `activity_log` entries (Note excepted).
- A task inserted directly in the DB appears in the inbox without a refresh.
- `npm test`, `npx tsc --noEmit`, and `npm run lint` all pass.
- Leads appears in the sidebar with a stub page.

## Next

- **Plan 3 — Clients, family & calendar:** client list, household page, first-class family-member pages, and the Calendar aggregating `lifecycle_dates` + birthdays.
