# Leads — Design Spec

**Date:** 2026-06-17
**Status:** Approved design, ready for implementation planning
**Part of:** The Life Office back-office dashboard (follows the Triage and Clients/Family/Calendar work)

## Summary

Build the **Leads** section: a lightweight CRM pipeline for prospective private clients that a (future) lead-finding agent surfaces. Leads move through stages, the agent drafts first-contact outreach that Meg approves (mirroring Triage), and a qualified lead can be converted into a `clients` record in one step. Presented as a Kanban board.

## Goals

- Give the lead-finding agent a place to surface prospective clients.
- Let Meg review each lead, approve/edit its outreach, advance it through a pipeline, and reject the dead ends.
- Convert a qualified lead into a client without re-entering details.
- Show the pipeline at a glance (Kanban).

## Non-Goals

- The lead-finding agent itself (separate; this is the human-in-the-loop surface).
- Sending outreach messages (the agent backend sends; the dashboard only records the decision).
- Drag-and-drop on the board (v1 advances stage via buttons on the detail page).
- A lead audit trail in `activity_log` (not supported by the existing schema — see Constraints).
- Rich agent-analysis structure (fit scores, reasoning blobs) — deliberately deferred (minimal schema).

## Workflow

A lead is a **prospective private client**. Stages:

`new → contacted → qualified → converted` (with `rejected` as a dead-end reachable from any active stage).

- **New** — agent has created the lead and drafted outreach, awaiting Meg's review.
- **Contacted** — Meg approved/sent the outreach (agent backend sends).
- **Qualified** — Meg judged the lead worth pursuing as a client.
- **Converted** — became a client (a `clients` record was created and linked).
- **Rejected** — not pursuing (dead-end, with an optional reason).

## Data Model — new `leads` table

```
id                  uuid pk default gen_random_uuid()
first_name          text not null
last_name           text
email               text
phone               text
source              text          -- where/why the agent found them (free text)
stage               text not null default 'new'
                      check (stage in ('new','contacted','qualified','converted','rejected'))
draft_message       text          -- agent's proposed outreach
draft_channel       text          -- e.g. whatsapp/email/imessage/sms
meg_edited_message  text          -- Meg's edited outreach, if any
notes               text          -- Meg's private notes
rejected_reason     text
converted_client_id uuid references public.clients(id) on delete set null
contacted_at        timestamptz
converted_at        timestamptz
created_at          timestamptz not null default now()
updated_at          timestamptz not null default now()
```

- **RLS:** enable + `authenticated` full-access policy (consistent with the other tables).
- **Realtime:** add `leads` to the `supabase_realtime` publication and set `replica identity full`, so the board updates live.
- Regenerate `lib/supabase/types.ts` after the migration.

## Constraints (called out, by design)

- **No `activity_log` for leads.** `activity_log` FKs to `clients`/`tasks` and its `activity_type` check has no lead values. Lead history is therefore the row itself (stage + timestamps + notes), not the activity feed. Acceptable for v1.
- **Convert with a missing surname.** `clients.last_name` is NOT NULL; if a lead has no `last_name`, convert sets it to an empty string for Meg to complete on the client page.

## Layout & Components

- **`/dashboard/leads`** — Kanban board. Five columns (New, Contacted, Qualified, Converted, Rejected), each with a count and the lead cards in that stage (name + source + short outreach/notes snippet). Cards link to the detail page. A realtime subscriber refreshes the board when leads change. No drag-drop.
- **`/dashboard/leads/[id]`** — lead detail (async `params`; `notFound()` if missing): header (name, stage badge, source), contact (email/phone), outreach draft (`meg_edited_message ?? draft_message` + channel), Meg's notes, and **stage-appropriate actions** + a back link to the board.

## Actions (Server Actions)

Each updates the lead, `revalidatePath`s, and (except Note) redirects sensibly. Mirrors the Triage action style (hidden `leadId` in a form).

- **approveOutreach** (New → Contacted): set `stage='contacted'`, `contacted_at=now()`. Agent backend sends.
- **editApproveOutreach** (New → Contacted): also store `meg_edited_message`.
- **markQualified** (Contacted → Qualified): set `stage='qualified'`.
- **rejectLead** (any active → Rejected): set `stage='rejected'`, `rejected_reason`.
- **convertLead** (Qualified → Converted): insert a `clients` row (`first_name`, `last_name ?? ''`, `email`, `phone`, `status='active'`, `onboarding_date=today`), set lead `stage='converted'`, `converted_at=now()`, `converted_client_id`; redirect to `/dashboard/clients/<newId>`.
- **noteLead**: update `notes`.

Stage-appropriate rendering: New shows approve/edit/reject/note; Contacted shows qualify/reject/note; Qualified shows convert/reject/note; Converted/Rejected show note only (terminal).

## Data Layer

- `lib/leads/queries.ts` — `getLeadsByStage()` (returns leads grouped/orderable for the board) + `getLead(id)` + a `STAGES` config (key, label, order) reused by board and helpers.
- `lib/leads/actions.ts` — the Server Actions above.
- Pure, unit-testable bits: a `leadName(lead)` helper and the `STAGES` ordering/labels; convert field-mapping kept simple and covered by the verification step.

## Testing Strategy

- **Unit:** `leadName` (first + last, first-only) and `STAGES` integrity (order/labels) via Vitest.
- **Migration:** `leads` table exists with the stage check + RLS on + in the realtime publication.
- **Board:** renders five columns with correct counts; a lead inserted directly in the DB appears live.
- **Detail + actions:** each action transitions the stage and writes the right fields; stage-appropriate buttons show.
- **Convert:** creates a prefilled `clients` row, links + flips the lead to converted, and redirects to the new client page.
- **Not found:** a bogus lead id renders the not-found page.
- `npm test`, `npx tsc --noEmit`, `npm run lint` pass.

## Out of scope / future

- Lead audit trail (would need `activity_log` schema changes or a `lead_events` table).
- Board drag-and-drop; lead filtering/search; bulk actions.
- Reopening converted/rejected leads.
- The lead-finding agent and its richer analysis payload (the schema can gain a flexible `brief` JSONB later if needed).
