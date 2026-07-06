# Conversations Dashboard: Meg's Side of the Concierge (Plan 2)

**Date:** 2026-07-06
**Status:** Approved design, pending implementation plan
**Owner:** Sam Cheshire
**Parent spec:** `2026-07-06-concierge-agent-design.md` (section 6 defines the experience; this spec makes it buildable)

## 1. Purpose

Give Meg the surface to see and answer client conversations: a chat-style Conversations view in the existing dashboard, real web push notifications to her phone, takeover/hand-back controls, quarantine claiming, family-aware thread routing, and the triage/agents-page additions from the parent spec. After this plan, the full Meg-first loop works end to end (client message, push, grace window, Meg replies from the dashboard, daemon sends it), with only the AI turn still stubbed (Plan 3).

## 2. Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Push scope | Real web push ships IN this plan (Sam's call), not deferred. Web Push API + VAPID, self-hosted; daemon sends via `pywebpush`. No third-party push vendor. |
| Thread model | REWORKED from Plan 1: a thread is a phone number, not a household. `conversations` becomes one-per-`client_channels`-row. Fixes cross-person message merging and misrouted replies before any real traffic exists. |
| Family linkage | `client_channels.family_member_id` (nullable FK) attaches each number to a person. Quarantine claiming = attaching a number to a client and optionally a family member. |
| Thread titles | Family name first, then person: "Henderson · Sarah". Used everywhere threads are listed. |
| Unread state | Derived (last inbound newer than Meg's last activity in the thread), not stored. |
| State transitions in TS | `lib/conversations/state.ts` mirrors the Python state machine's `on_meg_send` / `on_hand_back` rules, unit-tested case-for-case against `test_state.py` so the two cannot silently drift. |
| Testing | vitest for dashboard logic; daemon changes tested in the existing pytest suite (FakeDB + new FakePush). No live Twilio needed anywhere in this plan. |

## 3. Data model changes (TLO Dashboard Supabase project)

Migration (applied via Supabase MCP, then regenerate `lib/supabase/types.ts`):

- **`client_channels`**: add `family_member_id uuid null references family_members(id) on delete set null`.
- **`conversations`**: add `client_channel_id uuid null references client_channels(id) on delete cascade`; backfill is unnecessary (table is empty); then add `unique (client_channel_id)` and drop the old `unique (client_id, channel)`. `client_id` and `channel` columns remain (denormalised convenience for queries and RLS simplicity).
- **`tasks`**: add `conversation_id uuid null references conversations(id) on delete set null`.
- **`push_subscriptions`** (new): `id uuid pk default gen_random_uuid()`, `endpoint text not null unique`, `p256dh text not null`, `auth text not null`, `created_at timestamptz not null default now()`. RLS enabled; authenticated select/insert/delete (dashboard manages its own subscriptions); daemon uses service role.
- Realtime publication: no change needed (`conversations` and `messages` already published).

Single-user assumption: no `user_id` on `push_subscriptions`; every subscription belongs to Meg's dashboard login. Revisit only if the dashboard ever becomes multi-user.

## 4. Daemon changes (agent/concierge, Python)

Contained rework to make threads per-number, plus push sending:

- **`db.py` / `fakes.py`**: `get_or_create_conversation(client_id, channel)` becomes `get_or_create_conversation_for_channel(channel_row)` keyed on `client_channel_id` (still race-safe via the unique constraint). New method `conversation_address(conversation) -> str | None` returns the thread's own number (via its `client_channel_id`); `primary_address` remains only as a fallback for legacy rows with null `client_channel_id`. New methods: `list_push_subscriptions()`, `delete_push_subscription(endpoint)`.
- **`webhook.py` / `reconcile.py`**: inbound resolves address to the channel row, then to that row's conversation. Same state machine, unchanged.
- **`sender.py`**: outbound sends to `conversation_address(conv)`, falling back to `primary_address` only if `client_channel_id` is null. The Meg-race stand-down and backoff logic are untouched.
- **`push.py`** (new): `send_push(subscriptions, payload)` wrapping `pywebpush`; deletes subscriptions on 404/410; never raises into the caller (log and continue). Config gains `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto). Trigger points: (1) new inbound stored via webhook: title "Sarah (Henderson)", body = message preview, url = the thread; (2) reconcile-recovered inbound: at most ONE push per conversation per reconcile run (a downtime backlog must not fire 20 notifications); (3) grace expiry: NO push (she was already notified on inbound, per parent spec); (4) terminal send failure / thread flagged for Meg: "A message to Sarah (Henderson) couldn't be delivered".
- **`requirements.txt`**: add `pywebpush`.
- Push must never block or delay message processing; failures are logged and skipped.

## 5. Conversations view (dashboard)

New route `/dashboard/conversations`, added to the sidebar between Triage and Clients. Follows the Triage page pattern exactly: server component + `lib/conversations/queries.ts`, URL-param selection (`?conversation=<id>`), realtime component triggering `router.refresh()`, server actions in `actions.ts`.

- **Thread list**: title "Henderson · Sarah" (family name from `clients.last_name`, person from the linked `family_member` or the client themself); channel icon; last message preview; relative time; state chip: `awaiting you` (amber, live countdown to `grace_deadline`), `agent active` (sage), `handled`/`idle` (neutral). Unread = last inbound `created_at` newer than the newest Meg-authored message or Meg action in that thread; unread threads sort first, then by last activity.
- **Thread view**: transcript from `messages` ordered by `created_at`; inbound left, outbound right; agent-authored messages carry a Meg-only glyph + tint; per-message status ticks (queued, sent, delivered, failed); toggle between transcript and `rolling_summary` (renders "No summary yet" until Plan 3 populates it).
- **Reply box**: server action inserts `messages` row (`direction='outbound'`, `author='meg'`, `status='queued'`, `conversation_id`) then applies `on_meg_send` from `lib/conversations/state.ts` (`state='meg_active'`, `agent_paused=true`, `grace_deadline=null`). The daemon's sender-loop picks it up within ~5s.
- **Takeover / hand-back**: one toggle in the thread header. Take over: `agent_paused=true, state='meg_active'`. Hand back: `on_hand_back` (`agent_paused=false, state='idle'`). Any manual reply auto-takes-over.
- **Mobile**: list is full-screen; selecting a thread navigates to it; back returns to the list. Same responsive approach as the rest of the dashboard (Tailwind), no separate mobile components.

## 6. Family and client profile integration

- **Client profile (`clients/[id]`)**: "Conversations" section listing all threads across the household (every `client_channels` row for the client), with state chips, linking into the Conversations view.
- **Family member page (`clients/[id]/family/[memberId]`)**: same section filtered to that person's threads (channels where `family_member_id = memberId`). If they have no registered number: an "Add a number" form (channel + E.164 address) creating the `client_channels` row.
- Number management (add/remove/set primary/assign person) lives on these pages, not in a separate settings area.

## 7. Push notifications (dashboard side)

- **Service worker** at `public/sw.js` (served at the root scope as a static file): handles `push` (show notification) and `notificationclick` (focus/open the thread URL from the payload).
- **Subscribe flow**: banner on the Conversations page until enabled ("Get notified when clients message"); click asks permission, subscribes with the `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, saves via server action. iOS detection: if iPhone/iPad and not running installed (standalone), the banner shows Add-to-Home-Screen instructions instead (iOS only supports web push for installed PWAs).
- **Unsubscribe**: small toggle in the same banner area once enabled.
- **PWA manifest**: name "TLO Dashboard", `display: standalone`, start URL `/dashboard/conversations`, icons generated from the existing brand mark.
- **VAPID keys**: generated once; private key to VPS secrets manager + `/etc/tlo-concierge.env`; public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel env + `.env.local`.

## 8. Quarantine claiming

Section beneath the thread list (or its own sub-view) listing `quarantined_messages`: number, text, received time. Actions per row:
- **Claim**: pick client (searchable select), optionally family member, then create the `client_channels` row, create/find the conversation, move the quarantined message into `messages` (as a normal inbound, `received` status, arming the grace state via the same TS transition on the conversation row), delete the quarantine row.
- **Ignore**: delete the row.

## 9. Triage and agents page additions

- **Triage**: task cards render typed chips for `request_type` in (`brief`, `nudge`); when `conversation_id` is set, a "View conversation" link. Existing approve/dismiss/snooze machinery untouched. Nothing creates these rows yet (Plan 3 does); the dashboard just renders them.
- **Agents page**: concierge card alongside lead-finder: heartbeat freshness from `service_heartbeats` (live if `beat_at` within 2 minutes), messages today (count), threads awaiting Meg, quarantine count.

## 10. Error handling

- Server actions follow the Triage pattern: throw on Supabase error, `revalidatePath` on success.
- Single-operator assumption: no optimistic locking on conversation state (Meg is one person).
- Push failures (daemon or browser side) never block message flow; toast on the dashboard, log-and-skip in the daemon.
- Reply to a thread whose channel row was deleted: action surfaces an error toast; the daemon would fail the send terminally anyway (no address), flagging the thread.

## 11. Testing strategy

- **vitest** (co-located, `lib/conversations/*.test.ts`): TS state transitions mirroring `test_state.py` case-for-case; thread title formatting ("Henderson · Sarah", solo client, missing family member); unread derivation; grace countdown formatting; quarantine claim payload building.
- **pytest** (existing suite): thread-per-number resolution in webhook/reconcile (known number with family member, known number without, unknown number quarantines); sender uses the conversation's own address, falls back to primary only for legacy null `client_channel_id`; FakePush contract (sent payloads recorded, 410 deletes subscription, failure never raises); push triggered on inbound and terminal failure, NOT on grace expiry.
- **Manual end-to-end** (no Twilio needed): insert inbound rows via Supabase, watch them appear live in the Conversations view, reply, verify the row flips to `queued` and the daemon (running locally or on the VPS) marks it `sending`/`failed`-for-lack-of-Twilio as expected; verify push arrives on a subscribed device when an inbound row is inserted.

## 12. Out of scope (this plan)

- The AI agent turn, shadow mode, rolling summary generation, memory extraction, nudge engine (all Plan 3).
- Escalation push types (Plan 3, uses this plan's plumbing).
- WhatsApp 24-hour reopener templates (needs live Twilio; folded into Twilio provisioning follow-up).
- Multi-user dashboard auth/roles.
- iMessage and other channels.
