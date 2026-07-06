# Concierge Agent: Client Messaging as Meg

**Date:** 2026-07-06
**Status:** Approved design, pending implementation plan
**Owner:** Sam Cheshire

## 1. Purpose

Clients of The Life Office message "Meg" on their preferred channel. Meg replies herself when she can; when she cannot, an AI agent continues the conversation in her voice, gathers what is needed, and surfaces an actionable brief for Meg in the dashboard. The agent is conversation-only: it never books, spends, researches externally, or claims to have done any action. Meg performs every real-world action and closes the loop with the client personally.

Separately, the agent is proactive **to Meg only**: it surfaces upcoming client needs (insurance renewals, school holidays, lessons to pay for) as nudges in her triage. It never initiates contact with a client.

## 2. Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Launch channels | WhatsApp (UK) + SMS (US East Coast/Central), both via Twilio. iMessage deferred (needs third-party gateway). |
| Identity | The agent speaks **as Meg**. Clients are not told it is an AI. Mitigations: service-agreement line that Meg's communications "may be assisted by her office and digital tools"; human-realistic pacing; escalation on "is this really you?" probes. Known legal exposure (e.g. California bot-disclosure law) accepted by owner. |
| Initiative | Reactive to clients (reply-only). Proactive to Meg (nudges from lifecycle data + memory). |
| Meg-first flow | Client message notifies Meg; she has a grace window (global default 4 min, per-client override) to reply herself. Only if she does not respond does the agent pick up. |
| Agent scope | Conversation only. No booking, no spending, no external research, no action claims. Output is a gathered brief for Meg. |
| Scale | Under ~25 clients at launch. |
| Hosting | Agent runs on the TPP VPS (Hetzner, `openclaw` host) as a systemd service, per established TPP agent-hosting practice. Supabase "TLO Dashboard" project remains the data spine; dashboard stays on Vercel. |

## 3. Architecture

```
Client (WhatsApp UK / SMS US)
        |
     Twilio  (one WhatsApp number + one US number, one webhook shape)
        |  webhook via cloudflared tunnel
        v
Concierge daemon (TPP VPS, Python, systemd)         Meg's phone
  - webhook receiver (FastAPI)                          ^
  - grace-window scheduler                              | web push
  - agent turn runner (Claude API, "Meg" voice)         |
  - pacing engine (human-realistic delays)              |
  - outbound sender (single writer to Twilio)           |
        | reads/writes                                  |
        v                                               |
Supabase "TLO Dashboard" ---- realtime ----> Dashboard (Next.js/Vercel)
  conversations, messages,                     - Conversations chat view (PWA)
  briefs/nudges as tasks,                      - takeover / hand-back per thread
  client_channels, client_memory               - briefs land in existing Triage
        ^
        |
Nudge engine (cron on VPS)
  scans lifecycle_dates, family_members, client_memory -> nudges for Meg only
```

Code lives in this repo at `agent/concierge/`, sibling to `agent/lead-finder/`, reusing its patterns (knowledge/persona files, adapters, pytest suite, API retry resilience).

**Core loop:** inbound message -> daemon stores it in Supabase -> push notification to Meg -> grace timer starts -> if Meg replies (via dashboard), timer dies and agent never wakes -> otherwise the daemon runs an agent turn as Meg, paces it, sends, logs. When the ask is fully gathered (or the thread goes quiet), the agent writes a brief into triage.

**Takeover rule (absolute):** the agent picks up only if the grace window on the latest client message expires with no Meg activity since. Any Meg message in a thread silences the agent for that thread until she explicitly hands back (per-thread toggle).

**Single writer:** all outbound traffic, including Meg's dashboard replies, is sent by the daemon's sender. Ordering, pacing, and audit live in one place. Meg's replies are outbound-queue rows the daemon picks up via Supabase realtime.

## 4. Data model (Supabase "TLO Dashboard")

New tables joining existing `clients`, `family_members`, `lifecycle_dates`, `tasks`, `activity_log`:

- **`client_channels`**: `client_id`, `channel` (`whatsapp` | `sms`), `address` (E.164), `is_primary`. Inbound resolves to a client here; unknown numbers are quarantined, never answered as Meg.
- **`conversations`**: one per client per channel. `client_id`, `channel`, `state` (`idle` | `awaiting_meg` | `agent_active` | `meg_active`), `agent_paused` (Meg's takeover toggle), `grace_deadline` (persisted so timers survive daemon restarts), `rolling_summary`.
- **`messages`**: `conversation_id`, `direction`, `author` (`client` | `meg` | `agent`), `body`, `twilio_sid` (unique, for idempotency), `status` (`queued` | `sent` | `delivered` | `failed`), timestamps. Internal authorship is always distinguishable even though clients see one "Meg".
- **`client_memory`**: per-client and per-family-member learned facts.
  - `client_id`, optional `family_member_id`
  - `category` (`travel`, `insurance`, `accommodation`, `dining`, `schedule`, `communication_style`, ...)
  - `statement` (one plain-English fact, e.g. "prefers Airbnbs over hotels", "always takes the comprehensive option", "likes a stopover on long-haul")
  - `confidence`, `times_reinforced`
  - `source` (message or brief that evidenced it; provenance always)
  - `status` (`active` | `retired`; contradicting evidence retires rather than deletes)
- **Briefs and nudges are triage `tasks`** (typed `brief` / `nudge`, linked to `conversation_id` / `client_id`). Meg keeps one inbox.

**Memory learning feeds (three):**
1. Post-conversation extraction when a thread goes idle: distil new facts, reinforce repeats, retire contradictions.
2. Brief outcomes: the option Meg actually actioned is the strongest preference signal and is written back.
3. Meg directly, via an editable memory panel on `clients/[id]`.

**Memory consumers (two):** agent turn context assembly, and the nudge engine (e.g. swimming lessons in memory + term dates in `lifecycle_dates` -> "swimming lessons need paying for").

## 5. Agent turn: voice, guardrails, pacing

**Voice.** `agent/concierge/knowledge/` persona files per the lead-finder pattern: `SOUL.md` (who Meg is, how she writes: length, warmth, sign-offs, emoji habits, UK spelling) plus `VOICE_EXAMPLES.md` seeded from real exported Meg threads. Every real Meg reply in `messages` (`author='meg'`) grows a ground-truth corpus for refreshing examples. Per-client style notes live in `client_memory` under `communication_style`.

**Prompt assembly per turn:** persona + client profile, family, active memories, upcoming lifecycle dates + rolling summary + recent messages verbatim. The model is Meg continuing her own conversation, possibly mid-thread after real Meg's earlier replies.

**Hard guardrails (enforced in code, not just prompt):**
1. Conversation only. No tools except memory reading. Cannot browse, book, or pay.
2. Never claims completed actions. "Leave it with me, I'll sort options" is allowed (true: Meg will). "I've booked it" is never allowed.
3. Escalation triggers stop the agent and urgently ping Meg instead of replying: emergencies, medical/legal content, money requests, cancellation or complaint language, "is this really you?" probes.
4. Length and cadence discipline: WhatsApp-length messages; pacing engine delays replies by minutes scaled to length and time of day; overnight replies wait for a plausible waking hour unless time-critical (which escalates anyway).

**Brief creation.** The agent fills a slot sheet per ask (what, who, when, budget feel, known vs. unconfirmed preferences). When the ask is actionable, or the thread goes quiet, it writes the brief: one paragraph of situation, gathered details, relevant memories surfaced, suggested next steps. Partial information still becomes a brief, flagged incomplete.

## 6. Meg's dashboard experience

- **Conversations view** in the existing dashboard shell: thread list, unread badges, state chips (`agent active` / `awaiting you` / `handled`). Thread view shows full transcript with an authorship glyph on agent messages (visible only to Meg), and a toggle between transcript and rolling summary.
- **Notification flow:** push on inbound ("Sarah H: 'Can you look at flights to Boston for half term?'"); tap opens the PWA thread; replying kills the grace timer. If ignored, the agent picks up and the chip flips; no second notification. Briefs notify via triage.
- **Takeover/hand-back:** one "I've got this" toggle per thread header; any manual Meg reply also auto-silences the agent (belt and braces).
- **PWA + web push**, no native app. Push is sent by the daemon directly (VAPID web push), so notifications work even if Vercel is unreachable. Quiet hours configurable; escalations override.
- **Client profile addition:** editable memory panel (one line per fact, delete and correct controls).
- **Triage addition:** `brief` and `nudge` task types with conversation/client chips.
- **Agents page addition:** concierge card (daemon heartbeat, messages handled, escalations, briefs produced).

## 7. Error handling and failure modes

- **Daemon death:** systemd `Restart=always` + heartbeat/watchdog alerting. Twilio retries failed webhooks. Grace deadlines persist in `conversations.grace_deadline`; on restart the daemon re-arms pending timers and catches expired ones. Startup reconciliation against the Twilio API as backstop.
- **Send failures:** status-tracked retries with backoff; a message that stays undeliverable flips the thread to `awaiting you` and notifies Meg.
- **Duplicates/races:** unique `twilio_sid` makes webhook redelivery idempotent. Before any agent send, the daemon re-checks the thread for Meg activity since the triggering message and stands down if found.
- **Model failures:** retry with backoff (per lead-finder's proven pattern); past a ceiling, stop and escalate to Meg rather than send something broken.
- **Bad output:** pre-send checks in code: no action claims, no AI tells, nothing that should have escalated. One regeneration attempt, then escalate with draft attached. Check list starts strict and short.
- **WhatsApp 24-hour window:** agent replies are always in-session (reactive). Meg's later manual replies outside 24h require pre-approved reopener templates; the dashboard applies one automatically. SMS unaffected.
- **Unknown numbers:** quarantine list in dashboard; never answered as Meg.
- **Ops alerting:** existing VPS heartbeat + Telegram alert patterns, separate from Meg's client-facing push.

## 8. Testing strategy

- **Unit (pytest):** pre-send output checks, escalation detection, grace-timer state machine incl. restart recovery, Meg-race stand-down, webhook signature validation + idempotency, pacing, slot-sheet completeness judgement.
- **Voice/behaviour evals:** golden-conversation suite (holiday ask, insurance renewal, emergency escalation, "is this really you?" probe) scored mechanically for guardrails and by LLM judge for Meg-likeness against her real corpus. Regression net for every persona/prompt change.
- **Integration:** Twilio sandbox numbers against staging tables; full loop verification.
- **Shadow mode (the critical runway):** agent runs live but draft-only; replies land in the dashboard as suggestions Meg can send with one tap, edit, or reject. Accept/edit/reject labels train the voice. Per-client flag flips to live when her edit rate nears zero. Some clients may stay in shadow mode permanently by choice.
- **Pilot sequence:** Sam's and Meg's phones as fake clients -> one friendly client in shadow mode -> live with generous grace window -> tighten.

## 9. Pre-launch operational chores (from VPS audit 2026-05-24)

- Apply the 51 pending package updates and reboot the VPS before this becomes client-facing.
- Add `tlo-concierge.service` to the watchdog/heartbeat pattern and logrotate config.
- New cloudflared ingress route for the webhook receiver.
- Twilio credentials already exist in the VPS secrets manager (`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`); verify they are the right account for TLO or add TLO-specific keys.

## 10. Out of scope (this phase)

- iMessage (needs SendBlue/LoopMessage gateway; adapter layer keeps the door open).
- Telegram, Signal, and other channels.
- Agent-initiated client contact of any kind.
- Agent research/browsing tools (revisit later; "pull three holiday options" is arguably still information gathering, parked deliberately).
- Multi-assistant / team inbox semantics (single Meg identity only).
- Native mobile app.
