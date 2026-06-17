# Lead-Finder Agent — Design Spec (Principle 1 Plan)

**Date:** 2026-06-17
**Status:** Approved design, ready for implementation planning
**Built to:** TPP's *7 Principles of Production AI Agents* + *AI Agent Deployment Blueprint v1.0*. Where this spec and those documents differ, the documents win — this is the per-agent specification they call for (the SOUL/TOOLS/CONTEXT layer).

## What this is

The first internal agent for The Life Office: a **scheduled background worker that finds prospective private clients and surfaces them to Meg for approval**. It is the *producer* for the Leads pipeline already built — it writes rows into `public.leads` at `stage = 'needs_reviewing'`, where Meg approves/rejects them. It never contacts anyone; the `needs_reviewing` gate is the Principle 4 human boundary.

It runs **quiet/headless** for v1 (output = the Leads board, which is Meg's review surface). A conversational surface (OpenClaw/Telegram brief or chat) is a clean later addition — the engine is built standalone so adding a surface is additive, per the blueprint's "two surfaces, one brain."

## Principle 1 — Plan Before You Prompt

1. **Specific goal:** Discover people likely to buy The Life Office, write a fit summary + a draft first-touch for each, and create a lead at `needs_reviewing`. Never contact anyone directly.
2. **Tools (3, MVP):** `assess_ideal_client`, `discover_candidates`, `create_lead` (detailed below).
3. **Information to start:** the learned ideal-client profile (from outcomes), the v1 topic/signal criteria (below), and the existing `clients`/`leads` rows (for dedup + learning).
4. **Success:** the share of surfaced leads that **convert** to clients trends up over time. A run that adds well-judged, non-duplicate leads is a good run.
5. **Failure:** no candidates found, blocked/empty page fetches, duplicates, malformed data — each handled with a structured `status`, never a fabricated lead.
6. **When to ask a human:** **always** — every candidate becomes a `needs_reviewing` lead. The agent has no authority to contact anyone.

## Definition of a lead

**A person the agent judges likely to buy The Life Office** (strong *need* + plausible *means*). Contact details are captured **when the page publishes them** (hybrid); fit — not contactability — is the bar. Anonymous-but-high-fit candidates are surfaced with their post URL + handle and a draft on-platform reply; named candidates get email/phone when available.

## The 3 tools (Principle 2 — precise definitions)

Each returns structured JSON with a `status` field (`success` | `no_results` | `error`), per Principle 3.

1. **`assess_ideal_client`** — *read-only, Supabase.* Reads converted vs rejected leads and the `clients`/`family_members` they became, plus high-confidence rows from `agent_learnings`, and returns the current ideal-client profile (the signals that actually convert). This is the learning tool.
2. **`discover_candidates`** — *read-only, web.* Searches the open web for the need+means signals and reads the promising pages. Implementation: a **search step (Brave Search API — already in the VPS stack)** to find candidate posts/pages across Reddit, forums, Quora, blogs, then **Firecrawl** to read/extract the promising ones. Returns candidates with source URL, platform/handle, extracted text, and any contact details present. Parameters: search criteria (derived from the profile + topic set), max results.
3. **`create_lead`** — *read-write, Supabase, guarded.* Dedupes against existing `leads` and `clients`; if new, inserts a row at `stage = 'needs_reviewing'` with `ai_summary`, `source` (+ URL/handle), `draft_message`/`draft_channel`, and contact fields when known. Returns the created lead id or a `duplicate`/`error` status. **Cannot write any stage other than `needs_reviewing`** (code-enforced).

Start at exactly these three (the blueprint's "1 agent, 3 tools, 1 goal"); earn more through iteration.

## Starting criteria (v1 topic set — refined by learning)

- **Need signals:** mental-load/overwhelm, work–kids juggle, return-to-work after maternity, childcare & school logistics, family-holiday planning, household/life-admin backlog, single-parent juggling, sandwich-generation care, events/occasions.
- **Means signals:** nanny / private school / second home / frequent travel; demanding high-earning careers; explicit "would pay for help / is a concierge worth it".
- **Where (v1):** broad web search weighted to UK parent communities (Reddit r/HENRYUK, r/workingmoms, r/beyondthebump, r/Parenting, r/singleparents, etc.); Mumsnet/Netmums/Facebook noted as higher-fit but access-restricted, deferred.

The agent prioritises candidates hitting **need + means**; pure venting with no fit/means is skipped.

## Architecture (per the Blueprint)

- **Runs on the existing VPS** (n8n, LangFuse, OpenClaw already provisioned). Not on Vercel — a thorough run exceeds Vercel's ~300s function limit; the VPS worker has no such cap.
- **n8n** schedules the run (nightly, configurable) and orchestrates external API calls. Per the blueprint, **agent logic does NOT live in n8n** ("n8n is the nervous system, not the brain").
- **The Claude agentic loop is the brain**, run as a standalone worker: `input → think → act → observe → … → output`, terminated by the API's `stop_reason: "end_turn"` (never natural-language parsing); a max-iteration cap is a safety net only. Model tiering per the blueprint: a cheap model (Haiku 4.5) for routine turns, a stronger model (Sonnet 4.6) for fit judgement/summaries.
- **Supabase** stores leads, the learning tables, and the audit log. **LangFuse** captures full traces + cost (Principle 7).
- **Headless v1:** no OpenClaw surface yet; output is the Leads board. Adding a Telegram brief/chat later = point OpenClaw at the same engine + a notify step.

## Memory & learning (Blueprint's Five Layers — subset for v1)

- **Layer 1 — curated context:** a small frozen `CONTEXT` doc (ideal-client definition, TLO's offer, dos/don'ts) injected at run start.
- **Layer 4 — playbook learnings:** a new `agent_learnings` table (category, evidence, confidence, confirmation_count). After conversions/rejections, patterns accumulate; 3+ confirmations → medium, 5+ → high; high-confidence learnings steer `discover_candidates` and the fit summary. This is the "gets smarter, drives conversion up" mechanism.
- (Layers 2/3/5 — pipeline snapshot, conversation memory, self-curation — deferred; not needed for a headless discovery worker.)

## Guard rails (Principle 4 — enforced in code, not prompts)

- `create_lead` can only ever write `stage = 'needs_reviewing'` — the agent physically cannot contact anyone or advance a lead.
- Hard **dedupe** against `leads` + `clients` before insert.
- **Per-run cap** on new leads (configurable) to bound cost/noise.
- **Suppression:** never re-surface existing clients or already-seen leads.
- Every tool returns a structured `status`; the system prompt forbids fabricating a lead when a tool returns `no_results`/`error` (Principle: "say so honestly, never fabricate").

## Data model additions (Supabase)

- **New `agent_learnings` table** (per blueprint Layer 4): `id`, `agent` (text, e.g. `lead_finder`), `category`, `insight`, `evidence`, `confidence` (low/medium/high), `confirmation_count`, timestamps. RLS authenticated-only.
- **New `agent_audit_log` table** (or reuse a structured log): `id`, `agent`, `run_id`, `action`, `detail` (jsonb), `created_at`. RLS authenticated-only. (LangFuse is the rich trace; this is the in-DB audit Meg could see.)
- **`leads`**: reuse existing columns. Stash the discovery URL/handle in `source` (free text) for v1; a dedicated `source_url` column is a possible later tidy.
- No changes to `clients`/`family_members`.

## Observability (Principle 7)

Every run logs to LangFuse: each model message, each tool call (params + result), tokens per turn, time per tool, total run time, final output, and errors + handling. A run is fully reconstructable from logs. Alert on anomalies (loops, high token use, repeated errors).

## Testing (Principle 6)

- **Tool unit tests** (pure logic): dedupe/suppression decisions, the fit/qualification scoring, learning promotion thresholds (3→medium, 5→high).
- **Adversarial/edge inputs:** empty search results, blocked/empty fetches, malformed pages, candidates already in `clients`/`leads`, prompt-injection text inside scraped posts ("ignore your instructions").
- **End-to-end dry run** against real sources writing to a test scope; verify leads land at `needs_reviewing` with sensible summaries and zero duplicates.
- Re-run the suite on every change (Principle 6).

## Out of scope (v1)

- OpenClaw conversational surface (Telegram brief / chat) — easy later add.
- Mumsnet/Netmums/Facebook/LinkedIn sources (access-restricted) — backlog.
- Layers 2/3/5 of the memory system.
- Auto-contacting anyone — permanently out; the human gate is the design.

## Prerequisites

- VPS stack (n8n, LangFuse, OpenClaw) — **confirmed present**.
- API keys: Anthropic, Brave Search (in blueprint stack), Firecrawl, Supabase service role.
- Decision deferred to build: final search provider mix (Brave + Firecrawl assumed) and the nightly schedule time.
