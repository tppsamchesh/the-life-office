# Lead & Partner Finder Agent — Design Spec v2 (partnership-first)

**Date:** 2026-06-23
**Status:** Approved direction. Schema applied. Reality check run. v1 scope = **partnership-first, no paid enrichment**.
**Supersedes:** `2026-06-17-lead-finder-agent-design.md` (the Reddit-first version)
**Built to:** TPP's *7 Principles of Production AI Agents* + *AI Agent Deployment Blueprint v1.0*. Where this spec and those documents differ, the documents win.

## The story so far (why this shape)

1. **v1 rejected Reddit** as the primary channel — for a £1,500–£5,000/month trust service, Reddit is anonymous (no contact path), adverse-selected (DIY venters, not buyers), means-unverifiable, and brand-risky.
2. **We retargeted** to (a) named UK founders/execs via timing signals + enrichment, and (b) **partnerships** (wealth managers, EA agencies, maternity/nanny concierges) that refer repeatedly.
3. **A reality check (2026-06-23) found both enrichment tools are out of credits:** Hunter is 1000/1000 used (resets **2027-03-11**); FullEnrich balance is **0**. TLO won't buy more. So the *enrichment-powered* prospect motion **cannot run on existing resources right now**.
4. **Therefore v1 leads with partnerships**, which need **no paid enrichment** — partner firms publish their contact details on their own websites, read directly by `tpp-crawlee`. Enrichment-powered individual prospecting becomes a **later unlock** (when Hunter resets or FullEnrich is topped up).

A "lead" and a "partner" are the **same shape** to the agent (fit → contact path → drafted first-touch → `needs_reviewing` gate), so this is **one agent with a `lead_type`**, not two.

## Constraint: use only what TPP already has (and only what has capacity)

| Job | Service (existing key) | v1 capacity |
|---|---|---|
| Partner firms near affluent areas | Google Places (`GOOGLE_PLACES_API_KEY`) | ✅ |
| Directory + web search | Brave (`BRAVE_KEY`) + SerpAPI (`SERPAPI_KEY`) | ✅ |
| Read a site & extract **published** contact details | **tpp-crawlee** (`CRAWLEE_API_KEY`) | ✅ |
| Named UK directors/incorporations (free) | Companies House (`COMPANIES_HOUSE_KEY`) | ✅ |
| Brain | Anthropic (Haiku routine / Sonnet judgement) | ✅ |
| Name → email/phone (paid enrichment) | Hunter / FullEnrich | ❌ **out of credits** — deferred |

## v1 scope — BUILD NOW (partnership-first, 3 tools)

Back to the Blueprint's "1 agent, 3 tools, 1 goal." No enrichment tool in v1 — contacts come from public pages.

1. **`assess_ideal_client`** — *read-only, Supabase.* Reads converted vs rejected leads, the `clients`/`family_members` they became, and high-confidence `agent_learnings`; returns the current ideal-client profile **and** the partner-fit profile. The learning tool.
2. **`discover_candidates`** — *read-only, web/data; source-agnostic.* The model picks a `mode`:
   - `partner_directory` *(primary)* → Google Places + directory search (VouchedFor / Unbiased / FCA register, EA/VA agency lists, maternity/nanny concierge directories) → `tpp-crawlee` reads each firm's site → returns the firm, a fit judgement, **published contact details**, and `source_url`. No paid enrichment.
   - `published_prospect` *(free bonus)* → Companies House / funding news → find the company site → `tpp-crawlee` → extract any **published** contact email. Lower yield (founders rarely publish personal emails), but free.
   - `reddit_listen` *(optional)* → language/insight only, demoted.
   Returns candidates with name/firm, role, `lead_type`, `source_type`, `source_url`, extracted contact (when published), and evidence.
3. **`create_lead`** — *read-write, Supabase; guarded.* Dedupes against `leads`+`clients`; inserts at `stage='needs_reviewing'` with `lead_type`, `source_type`, `source_url`, `fit_score`, contact fields, `ai_summary` (the 2-line *why* + the scoring rationale Meg reads) and `brief` (structured evidence/signals). **No `draft_message` in v1** — drafting is deferred to a post-approval step. **Cannot write any stage other than `needs_reviewing`** (code-enforced).

### The loop (v1)
```
n8n schedule (scheduler + API hands, NOT the brain)
  → start agent_run
  → assess_ideal_client (profile + high-confidence learnings)
  → discover_candidates(partner_directory)   → tpp-crawlee extracts published contact + evidence
  → discover_candidates(published_prospect)   → free prospects where a contact email is published
       model judges fit → fit_score; skip < threshold (logged)
  → dedup vs leads+clients → create_lead(needs_reviewing)
  → finish agent_run (counts, tokens)
Output = the Leads board. Meg reviews `needs_reviewing` → approve/reject → outcomes feed learning.
```
Termination on `stop_reason: "end_turn"`; max-iteration cap is a safety net only. Model tiering: Haiku for routine turns, Sonnet for fit judgement / drafts / summaries.

### v1 starting criteria
- **Primary target — partners (UK):** wealth managers / IFAs, EA/VA agencies, maternity & nanny concierges (the three tightest fits).
- **Secondary — published-contact prospects:** founders/execs at companies whose sites publish a contact email.
- **GDPR/PECR:** business contacts only; flag sole-trader/consumer-type for human caution.

## LATER UNLOCK — enrichment-powered prospecting (when credits exist)

When Hunter resets (**2027-03-11**) or FullEnrich is topped up, add a 4th tool and the signal-driven prospect motion at scale:

4. **`enrich_contact`** — *external; guarded.* For candidates **above the fit threshold only**, resolves email/phone/LinkedIn via Hunter → FullEnrich. Hard **per-run credit cap**; **degrades gracefully to `no_results` when credits are 0** (so it's safe to ship dormant). Never enriches a known duplicate.

Then `discover_candidates` gains `prospect_signal` (Companies House appointments/incorporations + funding news → named candidate → `enrich_contact`). **Re-run `scripts/reality-check-enrichment.mjs` first** — with corrected targeting (real ICP names+domains, not random new incorporations) — to confirm enrichment hit-rate ≥ ~40% before trusting it.

**LinkedIn:** never crawled directly (ToS/ban risk). It's an enrichment/verification field via SerpAPI public lookups, or a later PhantomBuster lever.

## Memory & learning (Blueprint Layer 4 — built)
`agent_learnings` (applied) accumulates patterns from conversions/rejections: 3+ confirmations → medium, 5+ → high. High-confidence learnings steer `discover_candidates` and the fit score. `assess_ideal_client` reads it. (Layers 2/3/5 deferred.)

## Guard rails (Principle 4 — enforced in code)
- `create_lead`: only `stage='needs_reviewing'`; hard dedup vs `leads`+`clients` (email / domain / firm name); per-run new-lead cap.
- Suppression: existing clients + already-seen leads never re-surfaced.
- No-fabrication: on `no_results`/`error`, say so honestly — never invent a lead or a contact detail.
- (Later) `enrich_contact`: fit-gated; hard per-run credit cap; dormant-safe when credits are 0.

## Data model — APPLIED 2026-06-23 (migration `reshape_leads_source_agnostic_and_add_learnings`)
- **`leads`:** added `lead_type` (`prospect`|`partner`, default `prospect`), `source_type` (`signal`|`partner_directory`|`reddit`), `brief` (jsonb); renamed `source_post_url` → `source_url`; `source_subreddit` kept but deprecated; `fit_score` retained.
- **`agent_runs`:** renamed `subreddits_searched` → `sources_searched`; added `enrichments_spent`.
- **`agent_run_events`:** renamed `subreddit` → `source`, `username` → `identifier`; `decision` check allows `enrich`.
- **`agent_learnings`** (new): `id, agent, lead_type, category (signal|hook|source|timing|sector|objection), insight, evidence, confidence (low|medium|high), confirmation_count, timestamps`. RLS authenticated-only.
- `lib/supabase/types.ts` regenerated; `tsc` + tests green.

(Note: `source_type` currently allows `signal|partner_directory|reddit`. When `published_prospect` is implemented, widen this check — a one-line migration.)

## Architecture & observability
- **Runs on the VPS** as a standalone Claude worker (not Vercel — a full run exceeds the ~300s function cap). n8n schedules + makes API calls; agent logic is **not** in n8n.
- **Observability:** LangFuse is removed, so **`agent_runs` + `agent_run_events` are the Principle-7 trace** for v1 (tool, params, status, retries, decision, reasoning, tokens — fully reconstructable in-DB). Laminar is a later upgrade, not a v1 dependency.

## Dashboard surface (small follow-on, non-blocking)
The Leads board gains a **Prospects | Partners** filter (`lead_type`) and shows `brief` on the detail page. Not required for the agent to run.

## Prerequisites & decisions
- **Agent knowledge docs (SOUL / CONTEXT / USER / PLAYBOOK) come from TLO discovery with Meg — NOT authored by the assistant.** Required before the agent runs for real. `TOOLS.md` / `IDENTITY.md` are technical and can be drafted from this spec.
- **Decided — code location:** this repo, under `agent/lead-finder/` (versioned with the schema; deployed to and run on the VPS).
- **Decided — language:** **Python** (matches the existing VPS agents). No shared types with the repo; the worker uses the Supabase Python client + service-role key.

## Out of scope (v1)
- **Outreach drafting** — the agent surfaces a lead (why + score) only; the draft is written in a later post-approval step, and must never mention the partner revenue share or any money.
- Paid enrichment of any kind (no credits) — deferred unlock.
- Direct LinkedIn crawling; PhantomBuster — later lever.
- OpenClaw conversational surface (Telegram brief / chat) — additive later.
- Memory Layers 2/3/5.
- Auto-contacting anyone — permanently out; the human gate is the design.
