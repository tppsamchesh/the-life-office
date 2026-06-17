# Dashboard Foundation & Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a secure, authenticated, navigable empty dashboard at `/dashboard` — Supabase wired in, the `family_members` data migration applied, RLS enabled, login/logout working, and the Warm Admin sidebar shell with all nav sections (Triage placeholder + Finances/Agents stubs).

**Architecture:** New routes under `app/dashboard` in the existing Next.js 16 app. Auth and route-gating via `proxy.ts` (Next 16's renamed middleware). Supabase accessed through `@supabase/ssr` — a browser client for later realtime, a server client (async `cookies()`) for Server Components and Server Actions. RLS restricts every table to the `authenticated` role. This is Plan 1 of 3; Triage and the client/family/calendar pages follow in their own plans.

**Tech Stack:** Next.js 16.2.2 (App Router), React 19, Tailwind v4, TypeScript, Supabase (`@supabase/ssr`, `@supabase/supabase-js`).

---

## Next.js 16 Conventions (READ FIRST — differ from older Next.js)

These are confirmed from the bundled docs in `node_modules/next/dist/docs/`. Do not substitute older-Next.js habits:

- **`middleware.ts` is deprecated → use `proxy.ts`** at the project root. Export a function named `proxy` (or default). Source: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- **In `proxy.ts`, cookies are SYNC**: `request.cookies.getAll()`, `response.cookies.set(...)`.
- **In Server Components & Server Actions, `cookies()` is ASYNC**: `const store = await cookies()`. Source: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`.
- **Server Actions:** `'use server'` directive; call `revalidatePath(path)` from `next/cache` after mutations.
- **Route groups:** `app/dashboard/(app)/` — the `(app)` folder is NOT part of the URL; it scopes a layout to the authed pages while leaving `/dashboard/login` outside that layout.

## File Structure (created/modified in this plan)

- `lib/supabase/env.ts` — Supabase URL + publishable (anon) key
- `lib/supabase/client.ts` — browser client factory
- `lib/supabase/server.ts` — server client factory (async cookies)
- `lib/supabase/types.ts` — generated DB types
- `proxy.ts` — session refresh + `/dashboard` auth gate
- `app/dashboard/page.tsx` — redirects to `/dashboard/triage`
- `app/dashboard/login/page.tsx` — login form
- `app/dashboard/login/actions.ts` — `signIn` server action
- `app/dashboard/(app)/layout.tsx` — Warm Admin sidebar shell
- `app/dashboard/(app)/actions.ts` — `signOut` server action
- `app/dashboard/(app)/_components/Sidebar.tsx` — nav (client component for active state)
- `app/dashboard/(app)/triage/page.tsx` — placeholder (filled in Plan 2)
- `app/dashboard/(app)/clients/page.tsx` — placeholder (filled in Plan 3)
- `app/dashboard/(app)/calendar/page.tsx` — placeholder (filled in Plan 3)
- `app/dashboard/(app)/finances/page.tsx` — stub
- `app/dashboard/(app)/agents/page.tsx` — stub
- `app/layout.tsx` — MODIFY: add Playfair weight 600
- `.env.local` — MODIFY: add Supabase vars

Database (applied via Supabase migrations, not files):
- `family_members` table + `family_member_id` FKs on `tasks`/`lifecycle_dates`/`activity_log`
- data migration from `clients` JSON/partner fields
- RLS enable + policies

---

### Task 1: Install dependencies

**Files:** `package.json` (modified by npm)

- [ ] **Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Verify they resolve**

Run: `node -e "require('@supabase/ssr'); require('@supabase/supabase-js'); console.log('ok')"`
Expected: prints `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add supabase client libraries"
```

---

### Task 2: Supabase env config

**Files:**
- Modify: `.env.local`
- Create: `lib/supabase/env.ts`

- [ ] **Step 1: Get the publishable (anon) key**

The project is `qwuuzcuferetdacqihrg` (URL `https://qwuuzcuferetdacqihrg.supabase.co`). Get the **publishable/anon** key from Supabase → Project Settings → API (or via the Supabase MCP `get_publishable_keys`). It is a public key (shipped to the browser); RLS keeps the data safe.

- [ ] **Step 2: Add vars to `.env.local`**

Append:
```
# Supabase — TLO Dashboard
NEXT_PUBLIC_SUPABASE_URL=https://qwuuzcuferetdacqihrg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-publishable-key>
```

- [ ] **Step 3: Create `lib/supabase/env.ts`**

```ts
// Supabase connection. URL + publishable key are public (used in the browser);
// row-level security is what protects the data.
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qwuuzcuferetdacqihrg.supabase.co";

export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local");
}
```

- [ ] **Step 4: Commit** (`.env.local` is gitignored — only the module is committed)

```bash
git add lib/supabase/env.ts
git commit -m "feat: add supabase env config"
```

---

### Task 3: Supabase client factories

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create the browser client `lib/supabase/client.ts`**

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

// Used in Client Components (e.g. the realtime triage subscription in Plan 2).
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
```

- [ ] **Step 2: Create the server client `lib/supabase/server.ts`**

Note `cookies()` is awaited (Next 16). The `setAll` try/catch is required: when called from a Server Component (not an Action) writing cookies throws, and that's fine — `proxy.ts` refreshes the session.

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "./env";

// Used in Server Components and Server Actions.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — cookies are read-only here.
          // proxy.ts handles session refresh, so this is safe to ignore.
        }
      },
    },
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from these files.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: add supabase browser and server client factories"
```

---

### Task 4: Auth gate via `proxy.ts`

**Files:** Create: `proxy.ts` (project root, same level as `app/`)

- [ ] **Step 1: Create `proxy.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Next 16: this file replaces the deprecated `middleware.ts`.
// Cookies are read/written synchronously on the request/response here.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the auth token and tells us if the user is signed in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/dashboard/login";

  // Not signed in + hitting a protected dashboard route → send to login.
  if (!user && !isLogin) {
    return NextResponse.redirect(new URL("/dashboard/login", request.url));
  }

  // Already signed in + on the login page → send to the inbox.
  if (user && isLogin) {
    return NextResponse.redirect(new URL("/dashboard/triage", request.url));
  }

  return response;
}

export const config = {
  // Only run on dashboard routes.
  matcher: ["/dashboard/:path*"],
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: gate /dashboard routes with supabase auth in proxy"
```

---

### Task 5: Create `family_members` table + FKs

**Files:** Supabase migration (apply via Supabase MCP `apply_migration`, name `create_family_members`).

- [ ] **Step 1: Apply the schema migration**

```sql
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null check (type in ('partner','child','dependent','pet','staff','contact')),
  first_name text not null,
  last_name text,
  preferred_name text,
  date_of_birth date,
  email text,
  phone text,
  notes text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index family_members_client_id_idx on public.family_members (client_id);

alter table public.tasks
  add column family_member_id uuid references public.family_members(id) on delete set null;
alter table public.lifecycle_dates
  add column family_member_id uuid references public.family_members(id) on delete set null;
alter table public.activity_log
  add column family_member_id uuid references public.family_members(id) on delete set null;
```

- [ ] **Step 2: Verify the table exists**

Run (Supabase MCP `execute_sql`):
```sql
select column_name, data_type from information_schema.columns
where table_name = 'family_members' order by ordinal_position;
```
Expected: 13 columns including `type`, `first_name`, `date_of_birth`, `details`.

---

### Task 6: Migrate existing JSON/partner data into `family_members`

The real shapes (confirmed from the data): `children` = `[{name, dob, school?}]`, `pets` = `[{name, type, breed?, vet?}]`, `household_staff`/`key_contacts` are empty arrays today but handled for safety, plus `partner_name` on two clients.

**Files:** Supabase migration (`apply_migration`, name `migrate_family_members_data`).

- [ ] **Step 1: Apply the data migration**

```sql
-- Partners
insert into public.family_members (client_id, type, first_name, phone, email)
select id, 'partner', partner_name, partner_phone, partner_email
from public.clients
where partner_name is not null and partner_name <> '';

-- Children
insert into public.family_members (client_id, type, first_name, date_of_birth, details)
select c.id, 'child', ch->>'name', nullif(ch->>'dob','')::date,
       jsonb_strip_nulls(jsonb_build_object('school', ch->>'school'))
from public.clients c, jsonb_array_elements(c.children) ch;

-- Pets (JSON "type" = species, kept under details.species)
insert into public.family_members (client_id, type, first_name, details)
select c.id, 'pet', p->>'name',
       jsonb_strip_nulls(jsonb_build_object('species', p->>'type', 'breed', p->>'breed', 'vet', p->>'vet'))
from public.clients c, jsonb_array_elements(c.pets) p;

-- Household staff
insert into public.family_members (client_id, type, first_name, phone, email, details)
select c.id, 'staff', s->>'name', s->>'phone', s->>'email',
       jsonb_strip_nulls(jsonb_build_object('role', s->>'role'))
from public.clients c, jsonb_array_elements(c.household_staff) s
where s->>'name' is not null;

-- Key contacts
insert into public.family_members (client_id, type, first_name, phone, email, details)
select c.id, 'contact', k->>'name', k->>'phone', k->>'email',
       jsonb_strip_nulls(jsonb_build_object('relationship', k->>'relationship'))
from public.clients c, jsonb_array_elements(c.key_contacts) k
where k->>'name' is not null;
```

- [ ] **Step 2: Verify the migrated rows**

Run (`execute_sql`):
```sql
select c.first_name as client, fm.type, fm.first_name, fm.date_of_birth, fm.details
from public.family_members fm
join public.clients c on c.id = fm.client_id
order by c.first_name, fm.type;
```
Expected (based on current data): Harrington → partner Sophie, child Olivia (2017-03-12, school St Mary's Prep), pet Monty (dog, Labrador, Oakwood Vets); Shaw → partner Tom, children Freddie (2020-01-08) & Isla (2022-05-19), pet Fig (cat); Chen → no rows. Total 7 rows.

- [ ] **Step 3: Note** — the original `clients` JSON/partner columns are intentionally left in place (deprecated) until the rebuild is verified in use; a later migration drops them.

---

### Task 7: Enable RLS + policies

**Files:** Supabase migration (`apply_migration`, name `enable_rls_authenticated`).

- [ ] **Step 1: Apply RLS**

```sql
alter table public.clients         enable row level security;
alter table public.family_members  enable row level security;
alter table public.tasks           enable row level security;
alter table public.lifecycle_dates enable row level security;
alter table public.activity_log    enable row level security;

create policy "authenticated full access" on public.clients
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.family_members
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.tasks
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.lifecycle_dates
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on public.activity_log
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Verify RLS is on and anon is blocked**

Run (`execute_sql`):
```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('clients','family_members','tasks','lifecycle_dates','activity_log');
```
Expected: `rowsecurity = true` for all five.

- [ ] **Step 3: Confirm via advisors** that the "RLS disabled" critical warning is gone (Supabase MCP `get_advisors` type `security`). Expected: no `rls_disabled` finding for these tables.

---

### Task 8: Generate TypeScript types

**Files:** Create: `lib/supabase/types.ts`

- [ ] **Step 1: Generate types** for project `qwuuzcuferetdacqihrg` (Supabase MCP `generate_typescript_types`) and write the output verbatim to `lib/supabase/types.ts`.

- [ ] **Step 2: Verify the new table is present**

Run: `grep -c "family_members" lib/supabase/types.ts`
Expected: count ≥ 1.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add generated supabase types"
```

---

### Task 9: Login page + sign-in action

**Files:**
- Create: `app/dashboard/login/actions.ts`
- Create: `app/dashboard/login/page.tsx`

- [ ] **Step 1: Create the sign-in action `app/dashboard/login/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/dashboard/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard/triage");
}
```

- [ ] **Step 2: Create the login page `app/dashboard/login/page.tsx`**

A Server Component reading the optional `error` query param. The form posts directly to the server action.

```tsx
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F7F5F2] text-[#1F1F1F] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl mb-1">The Life Office</h1>
        <p className="text-sm text-[#8A857B] mb-8">Back office sign in</p>

        <form action={signIn} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              className="border border-[#D8D2C8] rounded-md px-3 py-2 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              name="password"
              required
              className="border border-[#D8D2C8] rounded-md px-3 py-2 bg-white"
            />
          </label>

          {error ? (
            <p className="text-sm text-[#C0392B]">{error}</p>
          ) : null}

          <button
            type="submit"
            className="mt-2 bg-[#A8B2A1] text-[#1F1F1F] font-medium rounded-md px-4 py-2.5 hover:bg-[#96a08f] transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/login
git commit -m "feat: add dashboard login page and sign-in action"
```

---

### Task 10: Sign-out action + dashboard index redirect

**Files:**
- Create: `app/dashboard/(app)/actions.ts`
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create the sign-out action `app/dashboard/(app)/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/dashboard/login");
}
```

- [ ] **Step 2: Create `app/dashboard/page.tsx`** (bare `/dashboard` → inbox)

```tsx
import { redirect } from "next/navigation";

export default function DashboardIndex() {
  redirect("/dashboard/triage");
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/(app)/actions.ts" app/dashboard/page.tsx
git commit -m "feat: add sign-out action and /dashboard redirect"
```

---

### Task 11: Add Playfair weight 600

**Files:** Modify: `app/layout.tsx:18`

- [ ] **Step 1: Update the Playfair weights** so serif headings can be semibold (the dashboard uses 600 for names/titles).

Change:
```ts
  weight: ["400"],
```
to:
```ts
  weight: ["400", "600"],
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: load Playfair 600 for dashboard headings"
```

---

### Task 12: Sidebar nav component

**Files:** Create: `app/dashboard/(app)/_components/Sidebar.tsx`

- [ ] **Step 1: Create the sidebar** (client component — uses `usePathname` for the active item). Includes the sign-out action pinned at the bottom.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "../actions";

const NAV = [
  { href: "/dashboard/triage", label: "Triage" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/finances", label: "Finances" },
  { href: "/dashboard/agents", label: "Agents" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-[#EFEBE4] border-r border-[#D8D2C8] flex flex-col">
      <div className="px-5 py-6">
        <span className="font-serif text-lg tracking-wide">The Life Office</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-white text-[#1F1F1F] font-medium border-l-2 border-[#A8B2A1]"
                  : "text-[#6B665D] hover:bg-white/60"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-auto px-3 pb-5">
        <button
          type="submit"
          className="w-full text-left rounded-md px-3 py-2 text-sm text-[#8A857B] hover:bg-white/60"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/dashboard/(app)/_components/Sidebar.tsx"
git commit -m "feat: add dashboard sidebar nav"
```

---

### Task 13: Authed shell layout

**Files:** Create: `app/dashboard/(app)/layout.tsx`

- [ ] **Step 1: Create the shell** wrapping all authed pages with the sidebar + a light Warm Admin canvas. (Auth is already enforced by `proxy.ts`; this layout is purely chrome.)

```tsx
import { Sidebar } from "./_components/Sidebar";

export default function DashboardAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F7F5F2] text-[#1F1F1F]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/(app)/layout.tsx"
git commit -m "feat: add dashboard shell layout"
```

---

### Task 14: Page placeholders + Finances/Agents stubs

Every nav link must resolve so the shell is fully navigable. Triage/Clients/Calendar are placeholders filled in later plans; Finances/Agents are the long-term stubs.

**Files:**
- Create: `app/dashboard/(app)/triage/page.tsx`
- Create: `app/dashboard/(app)/clients/page.tsx`
- Create: `app/dashboard/(app)/calendar/page.tsx`
- Create: `app/dashboard/(app)/finances/page.tsx`
- Create: `app/dashboard/(app)/agents/page.tsx`

- [ ] **Step 1: Triage placeholder** (filled in Plan 2)

```tsx
export default function TriagePage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-2">Triage</h1>
      <p className="text-sm text-[#8A857B]">
        The inbox is built in Plan 2.
      </p>
    </div>
  );
}
```

- [ ] **Step 1b: Clients placeholder** (`app/dashboard/(app)/clients/page.tsx`, built in Plan 3)

```tsx
export default function ClientsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-2">Clients</h1>
      <p className="text-sm text-[#8A857B]">
        Client and family pages are built in Plan 3.
      </p>
    </div>
  );
}
```

- [ ] **Step 1c: Calendar placeholder** (`app/dashboard/(app)/calendar/page.tsx`, built in Plan 3)

```tsx
export default function CalendarPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-2">Calendar</h1>
      <p className="text-sm text-[#8A857B]">
        Dates and renewals are built in Plan 3.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Finances stub**

```tsx
export default function FinancesPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-2">Finances</h1>
      <p className="text-sm text-[#8A857B]">
        Business finances will live here — designed in a later cycle.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Agents stub**

```tsx
export default function AgentsPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl mb-2">Agents</h1>
      <p className="text-sm text-[#8A857B]">
        Agent management will live here — designed in a later cycle.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/dashboard/(app)/triage" "app/dashboard/(app)/clients" "app/dashboard/(app)/calendar" "app/dashboard/(app)/finances" "app/dashboard/(app)/agents"
git commit -m "feat: add page placeholders and finances/agents stubs"
```

---

### Task 15: End-to-end verification

Requires a Supabase Auth user for Meg. If one doesn't exist, create it in Supabase → Authentication → Users (email + password), or have the user provide credentials.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: starts on `http://localhost:3000` with no build errors.

- [ ] **Step 2: Auth gate redirect** — visit `http://localhost:3000/dashboard/triage` while signed out.
Expected: redirected to `/dashboard/login`.

- [ ] **Step 3: Sign in** with Meg's credentials.
Expected: redirected to `/dashboard/triage`; sidebar shows Triage / Clients / Calendar / Finances / Agents with Triage active.

- [ ] **Step 4: Nav + stubs** — click Clients, Calendar, Finances, and Agents in turn.
Expected: each placeholder/stub page renders (no 404); the active nav item updates each time.

- [ ] **Step 5: Bare redirect** — visit `/dashboard`.
Expected: lands on `/dashboard/triage`.

- [ ] **Step 6: Sign out** — click Sign out.
Expected: redirected to `/dashboard/login`; visiting `/dashboard/triage` again redirects to login.

- [ ] **Step 7: RLS sanity** — confirm Task 7 verification still holds (RLS on, advisors clean).

- [ ] **Step 8: Lint**

Run: `npm run lint`
Expected: no errors.

---

## Done When

- Visiting any `/dashboard/*` route while signed out redirects to login.
- Meg can sign in, see the Warm Admin shell with all five nav items, visit the stubs, and sign out.
- `family_members` holds the 7 migrated rows; the old JSON columns remain untouched.
- RLS is enabled on all five tables with an authenticated-only policy; the security advisor is clean.
- `npx tsc --noEmit` and `npm run lint` pass.

## Next

- **Plan 2 — Triage inbox:** list, schema-tolerant task detail (the `ai_brief` renderer), approve / edit & approve / dismiss / snooze / note actions writing to `activity_log`, and the Supabase realtime subscription.
- **Plan 3 — Clients, family & calendar.**
