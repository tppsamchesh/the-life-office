# The Life Office — Back-Office Dashboard (Rebuild)

**Date:** 2026-06-17
**Status:** Approved design, ready for implementation planning

## Summary

Rebuild the lost back-office dashboard for The Life Office — a private, single-user
control centre that Meg uses to run the business. The original frontend was lost, but
the Supabase database (`TLO Dashboard`, project `qwuuzcuferetdacqihrg`, eu-west-2)
survived intact with live data. This project rebuilds the UI on top of the existing
schema, adds first-class family members, and lives at `/dashboard` inside the existing
Next.js site.

The dashboard is a **human-in-the-loop decision layer**. A separate agent backend (not
part of this project) talks to clients across channels, creates tasks, and executes the
ones Meg approves. The dashboard's job is to present those tasks for review and record
Meg's decisions — it does **not** send messages itself.

## Goals

- Restore a working back-office dashboard on the existing data.
- Give Meg a fast daily triage inbox for agent-surfaced tasks.
- Hold rich client profiles ("everything from discovery"), with each family member as
  their own first-class record and page.
- Surface important dates/renewals across all clients.
- Stub Finances and Agents in the navigation for later build-out.
- Close the current security hole (RLS disabled on all tables).

## Non-Goals

- Sending messages / channel integrations (owned by the separate agent backend).
- Building out Finances and Agents beyond placeholder pages.
- Multi-user / roles / per-row ownership (single user: Meg).
- Changing or rebuilding the public marketing site.

## Existing System

- **App:** Next.js 16 (App Router), React 19, Tailwind v4, TypeScript. Public site under
  `app/(site)`, Sanity Studio under `app/studio`.
- **Brand tokens** (in `app/globals.css`): `--charcoal #1F1F1F`, `--warm-white #F7F5F2`,
  `--taupe #D8D2C8`, `--sage #A8B2A1`; Playfair (serif), Geist (sans/mono).
- **Database (Supabase):** four tables, all currently **RLS-disabled** (security issue):
  - `clients` — rich household profile: contact, channels, partner_*, JSONB `children` /
    `pets` / `household_staff` / `key_contacts`, plus household preferences (travel,
    dining, gifting, budget_sensitivity, communication_style, etc.), status, onboarding.
  - `tasks` — triage/approval queue: `request_type`, `source` (reactive/proactive),
    `status` (pending/approved/dismissed/snoozed/executing/completed), `urgency`,
    `raw_message`, `request_summary`, `ai_brief` (jsonb), `draft_message`,
    `draft_channel`, `meg_notes`, `meg_edited_message`, `client_response`, `outcome`,
    `snoozed_until`, `dismissed_reason`, timestamps. FK → `clients`.
  - `lifecycle_dates` — important dates/renewals with `category`, `trigger_days_before`,
    recurrence. FK → `clients`.
  - `activity_log` — audit trail with `activity_type`, `description`, `metadata`.
    FKs → `clients`, `tasks`.

## Architecture

- **Location:** new route group `app/(dashboard)/dashboard/...` with its own layout
  (sidebar shell), fully separate from `app/(site)`, sharing only the brand tokens.
- **Supabase access:** `@supabase/ssr`. Server client for Server Components and Server
  Actions; browser client for the realtime subscription only.
- **Reads:** Server Components.
- **Writes:** Server Actions (approve/dismiss/snooze/note a task; edit client; edit
  family member). Actions revalidate the affected routes.
- **Realtime:** the triage inbox subscribes to `tasks` inserts/updates so new and
  changed tasks appear live without a refresh. Built in from day one.
- **Auth:** Supabase Auth, email + password, a single account for Meg. Middleware
  protects `/dashboard/*`; unauthenticated requests redirect to `/dashboard/login`.
- **Security (RLS):** enable RLS on every table and add policies granting full access to
  the `authenticated` role and nothing to `anon`. Applied together with the family
  member migration so nothing breaks. Single-user, so no per-row ownership logic.

## Data Model Changes

Existing four tables are kept. Family members become first-class:

- **New `family_members` table:**
  - `id` (uuid, pk), `client_id` (uuid, FK → clients, cascade)
  - `type` (text check: `partner` | `child` | `dependent` | `pet` | `staff` | `contact`)
  - `first_name`, `last_name` (nullable), `preferred_name` (nullable)
  - `date_of_birth` (date, nullable) — drives birthdays in the Calendar
  - `email`, `phone` (nullable) — for partner / contacts / staff
  - `notes` (text, nullable)
  - `details` (jsonb) — per-person, type-specific data (dietary, gift ideas, school,
    vet, breed, role, etc.)
  - `created_at`, `updated_at`
- **Nullable `family_member_id` FK** added to `tasks`, `lifecycle_dates`, and
  `activity_log`, so a task/date/activity entry can be pinned to a specific person
  rather than only the household.
- **Migration:** move existing JSON (`children`, `pets`, `household_staff`,
  `key_contacts`) and the `partner_*` fields into `family_members` rows. Only 3 clients,
  so this is small and safe. Keep the old columns in place (deprecated) until the rebuild
  is verified against real data, then drop them in a follow-up migration.
- **Household-level preferences** (travel, restaurants, overall dietary, budget
  sensitivity, communication style, accommodation) stay on `clients` — they describe the
  family as a unit. Per-person preferences live on `family_members.details`.

## Navigation (sidebar)

Warm Admin shell. Top to bottom:

1. **Triage** — default landing screen
2. **Clients** — list → client (household) → family-member pages
3. **Leads** — stub. Where an (future) lead-finding agent surfaces prospective clients
   for review. No data model yet; designed in its own later cycle.
4. **Calendar** — all important dates/renewals across clients, plus birthdays
5. **Finances** — stub
6. **Agents** — stub
7. (pinned bottom) **Account / logout**

## Visual Direction

**Warm Admin** — chosen over an editorial-dark or dark-cockpit treatment because it is a
tool used daily and needs density and fast scanning.

- Canvas: warm-white `#F7F5F2`; sidebar slightly deeper `#EFEBE4` with a `#D8D2C8`
  divider; cards white with `#E7E2D9` borders; charcoal `#1F1F1F` text.
- Accent: sage `#A8B2A1` for active nav, pills, markers.
- For UI labels and dense rows, sans-serif. For entity names and card/section headings,
  **Playfair serif** — confirmed by the original task-detail screenshot, which pairs a
  light editorial canvas with serif headings and sage accents. So the dashboard is Warm
  Admin density *with* the brand's serif headings, not a flat admin look.

## Triage Inbox (centrepiece)

- **List:** pending tasks, urgent first then newest. Each row: client (and the specific
  family member if the task is pinned), request-type pill, reactive/proactive indicator,
  one-line `request_summary`. New/changed tasks appear live via realtime.
- **Task detail** (opens alongside the list). Canonical layout, confirmed by the original
  screenshot, top to bottom:
  1. **Header** — source badge (`PROACTIVE` / `REACTIVE`), relative timestamp; the
     person/household name in serif; the `request_type` label beneath.
  2. **AI Spotted / brief** — `request_summary` plus the contextual fields from
     `ai_brief` (e.g. trigger, due date, current provider, holiday + dates, children).
     For proactive tasks this is the "here's what's coming up" panel, including the
     `lifecycle_dates` trigger context where relevant.
  3. **Research findings** (only when `ai_brief.options` is present) — a comparison list
     of options, each with name, summary, estimated cost (and saving/delta where the
     agent provides it). The recommended option is highlighted; `ai_brief.recommendation`
     is a **1-indexed** pointer into `options` (`1` = first option). Shows
     `recommendation_reasoning` and `notes_for_meg` when present. Collapsible.
  4. **Draft message** — the agent's proposed reply (`draft_message`) with the
     `draft_channel` shown as a pill and a character count.
- **`ai_brief` is heterogeneous** — its shape varies by `request_type` and will evolve
  (proactive renewal/childcare carry trigger context; reactive research/travel carry an
  `options` array). The renderer must be **schema-tolerant**: render the known sections
  when their keys exist, and fall back to a simple key/value display for any unrecognised
  fields rather than assuming a fixed structure.
- **Decisions** (action row at the bottom of the detail):
  - **Approve** — accept the draft as-is; sets status `approved` and stamps
    `approved_at`. The agent backend picks up approved tasks, executes them, and writes
    back `client_response` / `outcome` / `completed_at`.
  - **Edit & Approve** — open the draft for editing first (stored in
    `meg_edited_message`), then approve. A distinct action from Approve.
  - **Dismiss** — with `dismissed_reason`; status `dismissed`.
  - **Snooze** — until a chosen time (`snoozed_until`); drops out of the inbox and
    resurfaces when due.
  - **Note** — free-text `meg_notes` at any time.
- Every decision writes an `activity_log` entry, so it appears in the relevant
  client/person history.

## Client (Household) Page

"Everything from discovery." Header: household name, status + quick-fact chips
(budget, member count, open-task count), client-since / channel / location.

Two-column body:

- **Left:** Family & household (each member a clickable card → their page); Household
  preferences; Recent activity.
- **Right:** **Main Contact** (the household's primary contact — individual contact
  details live on each person's own page); Upcoming dates; Open tasks.

## Family-Member Page

Same pattern, scoped to one person: their details (contact, date of birth, and
type-specific fields from `details`), their important dates, their tasks, and their
activity history. Reached by clicking a card on the household page.

## Calendar Page

All `lifecycle_dates` across every client, plus birthdays derived from
`family_members.date_of_birth`. Honours `trigger_days_before` to highlight what's coming
due. Each entry links back to its client or person.

## Leads, Finances & Agents (stubs)

Real nav entries with placeholder pages describing what will live there, so the full
structure is visible. No data model yet; each designed in its own later cycle. **Leads**
is where a future lead-finding agent will surface prospective clients for Meg to review
(a pipeline that feeds into Clients).

## Testing Strategy

- **Migration:** verify all existing JSON/partner data lands as correct `family_members`
  rows for all 3 clients, with no loss; old columns remain readable until drop.
- **RLS:** confirm the anon key can no longer read/write any table, and the
  authenticated session can read/write all of them.
- **Auth:** unauthenticated `/dashboard/*` redirects to login; authenticated access
  works; logout clears the session.
- **Triage actions:** approve / edit & approve / dismiss / snooze / note each transition
  status correctly, write the right fields, and create an `activity_log` entry.
- **`ai_brief` rendering:** all four existing task shapes (renewal, childcare, research,
  travel) render correctly — options highlight the 1-indexed recommendation, proactive
  triggers show their context, and an unrecognised field falls back to key/value without
  breaking the page.
- **Realtime:** a task inserted directly in Supabase appears in the inbox without a
  manual refresh.
- **Pages:** client and family-member pages render real data; clicking a member opens
  their page; Calendar aggregates dates + birthdays across clients.

## Open Questions / Future

- Realtime is scoped to the triage inbox; could later extend to activity feeds.
- Finances and Agents data models to be designed in their own cycles.
- Drop deprecated `clients` JSON/partner columns once the rebuild is verified in use.
