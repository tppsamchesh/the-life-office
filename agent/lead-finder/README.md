# Lead & Partner Finder (TLO)

Background worker that finds referral **partners** and well-fit **prospects** for The Life
Office and surfaces them to Meg at `stage = needs_reviewing`. It never contacts anyone.

Design: `docs/superpowers/specs/2026-06-23-lead-finder-agent-design-v2.md`.
Knowledge (the business's voice/ICP): `knowledge/{SOUL,CONTEXT,USER,PLAYBOOK}.md`.

## Layout
- `lead_finder/guards.py` — needs_reviewing lock, dedup/suppression, fit threshold (pure)
- `lead_finder/extract.py`, `hosts.py`, `seen.py`, `prompt.py` — pure helpers
- `lead_finder/tools/` — assess_ideal_client, discover_candidates, create_lead (DI; pure logic)
- `lead_finder/adapters/` — Supabase (db), web search (Brave/SerpAPI), HTTP crawl (I/O)
- `lead_finder/agent.py` — the Claude loop (stop_reason termination, guards, run logging)
- `lead_finder/run.py` — entrypoint (n8n/cron calls this)

## Tests
```
python -m venv .venv && .venv/bin/pip install pytest
.venv/bin/python -m pytest        # 23 tests, pure logic, no network
```

## Run (on the VPS — Python 3.12, anthropic + supabase already installed)
```
pip install -r requirements.txt   # if needed
export ANTHROPIC_API_KEY=...                     # from secrets: ANTHROPIC_KEY
export LEAD_FINDER_SUPABASE_URL=https://qwuuzcuferetdacqihrg.supabase.co
export LEAD_FINDER_SUPABASE_SERVICE_KEY=...       # SETUP GAP — see below
export BRAVE_KEY=...  SERPAPI_KEY=...
python -m lead_finder.run
```
Tunables: `LEAD_FINDER_MODEL` (default claude-sonnet-4-6), `LEAD_FINDER_LEAD_CAP` (15),
`LEAD_FINDER_FIT_THRESHOLD` (60), `LEAD_FINDER_MAX_ITERATIONS` (40).

## Setup gaps before a live run
1. **TLO Dashboard service-role key** is not in the VPS secrets manager yet. Add it and
   export as `LEAD_FINDER_SUPABASE_SERVICE_KEY` (project `qwuuzcuferetdacqihrg`).
2. **tpp-crawlee endpoint** unconfirmed — the crawl adapter uses a direct HTTP fetch for now
   (good enough for most firm sites). To use tpp-crawlee, set `CRAWLEE_URL` and add a
   backend behind `HttpCrawl.read(url)`.
