# Concierge Messaging Spine Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the messaging spine for the TLO concierge agent: Supabase tables, a Python daemon (webhook receiver, grace-window scheduler, single-writer outbound sender), Twilio WhatsApp + SMS wiring, and VPS deployment. After this plan, client messages land in Supabase in real time, Meg's queued replies are sent out, the Meg-first grace timer runs live, and the agent-turn handler is a stub that logs (the real agent is Plan 3).

**Architecture:** Python daemon in `agent/concierge/` (sibling of `agent/lead-finder/`), deployed as a systemd service on the TPP VPS behind a cloudflared tunnel. Supabase "TLO Dashboard" project is the data spine. The daemon is the ONLY process that talks to Twilio. Spec: `docs/superpowers/specs/2026-07-06-concierge-agent-design.md`.

**Tech Stack:** Python 3.12, FastAPI + uvicorn, supabase-py, twilio, pytest. Supabase Postgres with RLS + realtime.

## Global Constraints

Every task implicitly includes these. Do not deviate; do not improvise beyond what a task states.

- Python 3.12. Type hints on every public function. Stdlib `logging` only (no print).
- All datetimes are timezone-aware UTC (`datetime.now(timezone.utc)`). DB timestamps travel as ISO 8601 strings. Convert ONLY via `concierge/timeutil.py` helpers (defined in Task 2).
- The daemon is the single writer to Twilio. Nothing else ever calls Twilio send.
- Secrets come from environment variables only. Never commit a secret, a `.env` file, or a real phone number.
- TDD strictly: within each task, write the failing test, run it and see it fail, then implement, then see it pass. Never skip the failing run.
- Commit style: short imperative sentence, matching repo history (e.g. "Add concierge state machine"). No emoji.
- No em dash characters anywhere (use commas, colons, or full stops).
- Run all Python commands from `agent/concierge/` with the venv activated: `cd agent/concierge && source .venv/bin/activate`.
- Channel values are exactly `whatsapp` or `sms`. Conversation states are exactly `idle`, `awaiting_meg`, `agent_active`, `meg_active`. Message statuses are exactly `received`, `draft`, `queued`, `sending`, `sent`, `delivered`, `failed`, `cancelled`. Authors are exactly `client`, `meg`, `agent`.
- The Supabase project is "TLO Dashboard" (the one `lib/supabase/env.ts` points at), NOT the TPP internal project.

## File Structure

```
agent/concierge/
  README.md                  Task 11: runbook
  requirements.txt           Task 2
  pytest.ini                 Task 2
  concierge/
    __init__.py              Task 2 (empty)
    config.py                Task 2: env-driven Config
    timeutil.py              Task 2: ISO <-> datetime helpers
    channels.py              Task 3: Twilio payload parsing / address mapping
    state.py                 Task 4: pure conversation state machine
    db.py                    Task 5: Supabase adapter (ConciergeDB)
    twilio_gateway.py        Task 6: Twilio send/validate/list wrapper
    webhook.py               Task 7: FastAPI app (inbound, status, health)
    sender.py                Task 8: outbound queue worker
    grace.py                 Task 9: grace scheduler + heartbeat
    reconcile.py             Task 10: startup reconciliation
    run.py                   Task 11: entrypoint wiring
  tests/
    __init__.py              Task 2 (empty)
    fakes.py                 Task 5: FakeDB + FakeGateway used by Tasks 7-10
    test_config.py           Task 2
    test_timeutil.py         Task 2
    test_channels.py         Task 3
    test_state.py            Task 4
    test_fakes.py            Task 5
    test_twilio_gateway.py   Task 6
    test_webhook.py          Task 7
    test_sender.py           Task 8
    test_grace.py            Task 9
    test_reconcile.py        Task 10
```

Database changes (Task 1) are applied via the Supabase MCP tools, not files in this repo, matching how the dashboard plans did it.

---

### Task 1: Database migration and regenerated types

**Files:**
- Modify: `lib/supabase/types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Produces: tables `client_channels`, `conversations`, `messages`, `quarantined_messages`, `service_heartbeats` with the exact columns below. Every later task assumes these exact names and CHECK constraints.

- [ ] **Step 1: Find the TLO Dashboard project id**

Call the Supabase MCP tool `list_projects` (tool name contains `supabase` and `list_projects`). Match the project whose URL host equals the host in `lib/supabase/env.ts`. Record its `id` as PROJECT_ID for the next steps.

- [ ] **Step 2: Apply the migration**

Call the Supabase MCP `apply_migration` tool with `project_id` = PROJECT_ID, `name` = `concierge_messaging_spine`, and `query` set to exactly:

```sql
create table public.client_channels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','sms')),
  address text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (channel, address)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','sms')),
  state text not null default 'idle'
    check (state in ('idle','awaiting_meg','agent_active','meg_active')),
  agent_paused boolean not null default false,
  grace_deadline timestamptz,
  grace_seconds integer not null default 240,
  rolling_summary text,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, channel)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  author text not null check (author in ('client','meg','agent')),
  body text not null,
  twilio_sid text unique,
  status text not null default 'received'
    check (status in ('received','draft','queued','sending','sent','delivered','failed','cancelled')),
  error text,
  send_attempts integer not null default 0,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz
);
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index messages_queue_idx
  on public.messages (status) where status in ('queued','sending');

create table public.quarantined_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('whatsapp','sms')),
  address text not null,
  body text not null,
  twilio_sid text unique,
  received_at timestamptz not null default now(),
  claimed_client_id uuid references public.clients(id)
);

create table public.service_heartbeats (
  service text primary key,
  beat_at timestamptz not null default now()
);

alter table public.client_channels enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.quarantined_messages enable row level security;
alter table public.service_heartbeats enable row level security;

create policy "authenticated select client_channels" on public.client_channels
  for select to authenticated using (true);
create policy "authenticated insert client_channels" on public.client_channels
  for insert to authenticated with check (true);
create policy "authenticated update client_channels" on public.client_channels
  for update to authenticated using (true);

create policy "authenticated select conversations" on public.conversations
  for select to authenticated using (true);
create policy "authenticated update conversations" on public.conversations
  for update to authenticated using (true);

create policy "authenticated select messages" on public.messages
  for select to authenticated using (true);
create policy "authenticated insert messages" on public.messages
  for insert to authenticated with check (true);

create policy "authenticated select quarantined" on public.quarantined_messages
  for select to authenticated using (true);
create policy "authenticated update quarantined" on public.quarantined_messages
  for update to authenticated using (true);

create policy "authenticated select heartbeats" on public.service_heartbeats
  for select to authenticated using (true);

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
```

Expected: success. The daemon uses the service-role key and bypasses RLS; these policies are for the dashboard (authenticated role) in Plan 2.

- [ ] **Step 3: Verify tables exist**

Call the Supabase MCP `list_tables` tool with `project_id` = PROJECT_ID. Expected: the five new tables appear alongside the existing `clients`, `tasks`, etc.

- [ ] **Step 4: Regenerate TypeScript types**

Call the Supabase MCP `generate_typescript_types` tool with `project_id` = PROJECT_ID. Overwrite the entire contents of `lib/supabase/types.ts` with the output.

- [ ] **Step 5: Verify the app still typechecks**

Run: `npx tsc --noEmit` (from the repo root)
Expected: exit code 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "Add concierge messaging tables and regenerate Supabase types"
```

---

### Task 2: Package scaffold, config, and time utilities

**Files:**
- Create: `agent/concierge/requirements.txt`
- Create: `agent/concierge/pytest.ini`
- Create: `agent/concierge/concierge/__init__.py`
- Create: `agent/concierge/concierge/config.py`
- Create: `agent/concierge/concierge/timeutil.py`
- Create: `agent/concierge/tests/__init__.py`
- Test: `agent/concierge/tests/test_config.py`
- Test: `agent/concierge/tests/test_timeutil.py`
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Produces: `Config` dataclass and `load_config(env: dict[str, str] | None = None) -> Config` in `concierge.config`; `parse_ts(value: str | datetime | None) -> datetime | None` and `iso(dt: datetime) -> str` in `concierge.timeutil`. All later tasks import these.

- [ ] **Step 1: Create scaffold files**

`agent/concierge/requirements.txt`:

```
fastapi>=0.115,<1
uvicorn[standard]>=0.30,<1
supabase>=2.6,<3
twilio>=9,<10
httpx>=0.27,<1
pytest>=8,<9
```

`agent/concierge/pytest.ini`:

```
[pytest]
testpaths = tests
pythonpath = .
```

`agent/concierge/concierge/__init__.py` and `agent/concierge/tests/__init__.py`: empty files.

Append to the repo-root `.gitignore` (create the line only if not already present):

```
agent/concierge/.venv/
```

- [ ] **Step 2: Create the venv and install dependencies**

```bash
cd agent/concierge
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Expected: installs complete without error.

- [ ] **Step 3: Write the failing tests**

`agent/concierge/tests/test_config.py`:

```python
import pytest

from concierge.config import load_config

BASE_ENV = {
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_SERVICE_KEY": "service-key",
    "TWILIO_ACCOUNT_SID": "AC123",
    "TWILIO_AUTH_TOKEN": "token123",
    "TWILIO_WHATSAPP_FROM": "whatsapp:+447700900000",
    "TWILIO_SMS_FROM": "+15550001111",
    "PUBLIC_BASE_URL": "https://tlo-concierge.example.com/",
}


def test_load_config_reads_env_and_applies_defaults():
    cfg = load_config(BASE_ENV)
    assert cfg.twilio_account_sid == "AC123"
    assert cfg.public_base_url == "https://tlo-concierge.example.com"  # trailing slash stripped
    assert cfg.port == 8090
    assert cfg.grace_default_seconds == 240
    assert cfg.poll_interval_seconds == 5
    assert cfg.max_send_attempts == 5


def test_load_config_reads_overrides():
    env = dict(BASE_ENV)
    env["PORT"] = "9000"
    env["GRACE_DEFAULT_SECONDS"] = "120"
    cfg = load_config(env)
    assert cfg.port == 9000
    assert cfg.grace_default_seconds == 120


def test_load_config_missing_required_var_raises():
    env = dict(BASE_ENV)
    del env["TWILIO_AUTH_TOKEN"]
    with pytest.raises(KeyError):
        load_config(env)
```

`agent/concierge/tests/test_timeutil.py`:

```python
from datetime import datetime, timezone

from concierge.timeutil import iso, parse_ts


def test_parse_ts_none_returns_none():
    assert parse_ts(None) is None


def test_parse_ts_datetime_passthrough():
    dt = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)
    assert parse_ts(dt) == dt


def test_parse_ts_iso_string():
    dt = parse_ts("2026-07-06T12:00:00+00:00")
    assert dt == datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)


def test_parse_ts_supabase_z_suffix():
    dt = parse_ts("2026-07-06T12:00:00Z")
    assert dt == datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)


def test_iso_round_trip():
    dt = datetime(2026, 7, 6, 12, 30, 15, tzinfo=timezone.utc)
    assert parse_ts(iso(dt)) == dt
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `python -m pytest tests/test_config.py tests/test_timeutil.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.config'` (and timeutil).

- [ ] **Step 5: Implement config and timeutil**

`agent/concierge/concierge/config.py`:

```python
"""Environment-driven configuration for the concierge daemon."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    supabase_url: str
    supabase_service_key: str
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_whatsapp_from: str
    twilio_sms_from: str
    public_base_url: str
    port: int = 8090
    grace_default_seconds: int = 240
    poll_interval_seconds: int = 5
    max_send_attempts: int = 5


def load_config(env: dict[str, str] | None = None) -> Config:
    e: dict[str, str] = dict(os.environ) if env is None else env
    return Config(
        supabase_url=e["SUPABASE_URL"],
        supabase_service_key=e["SUPABASE_SERVICE_KEY"],
        twilio_account_sid=e["TWILIO_ACCOUNT_SID"],
        twilio_auth_token=e["TWILIO_AUTH_TOKEN"],
        twilio_whatsapp_from=e["TWILIO_WHATSAPP_FROM"],
        twilio_sms_from=e["TWILIO_SMS_FROM"],
        public_base_url=e["PUBLIC_BASE_URL"].rstrip("/"),
        port=int(e.get("PORT", "8090")),
        grace_default_seconds=int(e.get("GRACE_DEFAULT_SECONDS", "240")),
        poll_interval_seconds=int(e.get("POLL_INTERVAL_SECONDS", "5")),
        max_send_attempts=int(e.get("MAX_SEND_ATTEMPTS", "5")),
    )
```

`agent/concierge/concierge/timeutil.py`:

```python
"""ISO 8601 <-> timezone-aware datetime helpers. The only sanctioned conversion path."""
from datetime import datetime, timezone


def parse_ts(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(text)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `python -m pytest tests/test_config.py tests/test_timeutil.py -v`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
cd ../..  # repo root
git add .gitignore agent/concierge/requirements.txt agent/concierge/pytest.ini \
  agent/concierge/concierge/__init__.py agent/concierge/concierge/config.py \
  agent/concierge/concierge/timeutil.py agent/concierge/tests/__init__.py \
  agent/concierge/tests/test_config.py agent/concierge/tests/test_timeutil.py
git commit -m "Scaffold concierge daemon package with config and time helpers"
```

---

### Task 3: Channel parsing (Twilio payload normalisation)

**Files:**
- Create: `agent/concierge/concierge/channels.py`
- Test: `agent/concierge/tests/test_channels.py`

**Interfaces:**
- Produces: `InboundMessage` frozen dataclass with fields `channel: str`, `address: str`, `body: str`, `twilio_sid: str`; `parse_inbound(form: dict[str, str]) -> InboundMessage`; `to_twilio_address(channel: str, address: str) -> str`. Tasks 6, 7, and 10 import all three.

- [ ] **Step 1: Write the failing test**

`agent/concierge/tests/test_channels.py`:

```python
import pytest

from concierge.channels import InboundMessage, parse_inbound, to_twilio_address


def test_parse_whatsapp_inbound():
    form = {"From": "whatsapp:+447700900123", "Body": "Hi Meg", "MessageSid": "SM001"}
    msg = parse_inbound(form)
    assert msg == InboundMessage(
        channel="whatsapp", address="+447700900123", body="Hi Meg", twilio_sid="SM001"
    )


def test_parse_sms_inbound():
    form = {"From": "+16175550100", "Body": "Hey", "MessageSid": "SM002"}
    msg = parse_inbound(form)
    assert msg.channel == "sms"
    assert msg.address == "+16175550100"


def test_parse_missing_body_defaults_to_empty_string():
    form = {"From": "+16175550100", "MessageSid": "SM003"}
    assert parse_inbound(form).body == ""


def test_parse_missing_from_raises_key_error():
    with pytest.raises(KeyError):
        parse_inbound({"Body": "x", "MessageSid": "SM004"})


def test_to_twilio_address_whatsapp_adds_prefix():
    assert to_twilio_address("whatsapp", "+447700900123") == "whatsapp:+447700900123"


def test_to_twilio_address_sms_is_bare():
    assert to_twilio_address("sms", "+16175550100") == "+16175550100"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_channels.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.channels'`.

- [ ] **Step 3: Implement**

`agent/concierge/concierge/channels.py`:

```python
"""Normalise Twilio webhook payloads to channel-agnostic values and back."""
from dataclasses import dataclass

_WHATSAPP_PREFIX = "whatsapp:"


@dataclass(frozen=True)
class InboundMessage:
    channel: str  # 'whatsapp' | 'sms'
    address: str  # E.164, no prefix
    body: str
    twilio_sid: str


def parse_inbound(form: dict[str, str]) -> InboundMessage:
    raw_from = form["From"]
    if raw_from.startswith(_WHATSAPP_PREFIX):
        channel = "whatsapp"
        address = raw_from[len(_WHATSAPP_PREFIX):]
    else:
        channel = "sms"
        address = raw_from
    return InboundMessage(
        channel=channel,
        address=address,
        body=form.get("Body", ""),
        twilio_sid=form["MessageSid"],
    )


def to_twilio_address(channel: str, address: str) -> str:
    return f"{_WHATSAPP_PREFIX}{address}" if channel == "whatsapp" else address
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_channels.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/channels.py agent/concierge/tests/test_channels.py
git commit -m "Add concierge channel parsing for Twilio payloads"
```

---

### Task 4: Conversation state machine (pure functions)

**Files:**
- Create: `agent/concierge/concierge/state.py`
- Test: `agent/concierge/tests/test_state.py`

**Interfaces:**
- Produces: `ConvState` frozen dataclass with fields `state: str`, `agent_paused: bool`, `grace_deadline: datetime | None`; transitions `on_inbound(current, now, grace_seconds) -> ConvState`, `on_meg_send(current) -> ConvState`, `on_grace_expired(current, now) -> ConvState | None`, `on_hand_back(current) -> ConvState`. Tasks 7 and 9 import these.
- Spec rules encoded here (spec section 3): inbound arms the grace timer unless Meg has taken over; any Meg send silences the agent (`agent_paused=True`) until explicit hand-back; grace expiry fires only from `awaiting_meg` with a past deadline and no pause.

- [ ] **Step 1: Write the failing test**

`agent/concierge/tests/test_state.py`:

```python
from datetime import datetime, timedelta, timezone

from concierge.state import ConvState, on_grace_expired, on_hand_back, on_inbound, on_meg_send

NOW = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)
IDLE = ConvState(state="idle", agent_paused=False, grace_deadline=None)


def test_inbound_arms_grace_timer():
    new = on_inbound(IDLE, NOW, grace_seconds=240)
    assert new.state == "awaiting_meg"
    assert new.agent_paused is False
    assert new.grace_deadline == NOW + timedelta(seconds=240)


def test_inbound_while_meg_has_taken_over_does_not_arm_timer():
    current = ConvState(state="meg_active", agent_paused=True, grace_deadline=None)
    new = on_inbound(current, NOW, grace_seconds=240)
    assert new.state == "meg_active"
    assert new.agent_paused is True
    assert new.grace_deadline is None


def test_meg_send_silences_agent_and_kills_timer():
    current = ConvState(state="awaiting_meg", agent_paused=False, grace_deadline=NOW)
    new = on_meg_send(current)
    assert new == ConvState(state="meg_active", agent_paused=True, grace_deadline=None)


def test_grace_expiry_fires_when_deadline_passed():
    current = ConvState(state="awaiting_meg", agent_paused=False, grace_deadline=NOW)
    new = on_grace_expired(current, NOW + timedelta(seconds=1))
    assert new == ConvState(state="agent_active", agent_paused=False, grace_deadline=None)


def test_grace_expiry_does_not_fire_early():
    current = ConvState(state="awaiting_meg", agent_paused=False, grace_deadline=NOW)
    assert on_grace_expired(current, NOW - timedelta(seconds=1)) is None


def test_grace_expiry_does_not_fire_from_other_states():
    for state in ("idle", "agent_active", "meg_active"):
        current = ConvState(state=state, agent_paused=False, grace_deadline=NOW)
        assert on_grace_expired(current, NOW + timedelta(hours=1)) is None


def test_grace_expiry_does_not_fire_when_paused():
    current = ConvState(state="awaiting_meg", agent_paused=True, grace_deadline=NOW)
    assert on_grace_expired(current, NOW + timedelta(hours=1)) is None


def test_grace_expiry_does_not_fire_without_deadline():
    current = ConvState(state="awaiting_meg", agent_paused=False, grace_deadline=None)
    assert on_grace_expired(current, NOW) is None


def test_hand_back_resets_to_idle_and_unpauses():
    current = ConvState(state="meg_active", agent_paused=True, grace_deadline=None)
    assert on_hand_back(current) == ConvState(state="idle", agent_paused=False, grace_deadline=None)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_state.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.state'`.

- [ ] **Step 3: Implement**

`agent/concierge/concierge/state.py`:

```python
"""Pure conversation state machine. No IO. Spec: section 3 takeover rules."""
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class ConvState:
    state: str  # 'idle' | 'awaiting_meg' | 'agent_active' | 'meg_active'
    agent_paused: bool
    grace_deadline: datetime | None


def on_inbound(current: ConvState, now: datetime, grace_seconds: int) -> ConvState:
    if current.agent_paused:
        return ConvState(state="meg_active", agent_paused=True, grace_deadline=None)
    return ConvState(
        state="awaiting_meg",
        agent_paused=False,
        grace_deadline=now + timedelta(seconds=grace_seconds),
    )


def on_meg_send(current: ConvState) -> ConvState:
    return ConvState(state="meg_active", agent_paused=True, grace_deadline=None)


def on_grace_expired(current: ConvState, now: datetime) -> ConvState | None:
    if current.state != "awaiting_meg" or current.agent_paused:
        return None
    if current.grace_deadline is None or now < current.grace_deadline:
        return None
    return ConvState(state="agent_active", agent_paused=False, grace_deadline=None)


def on_hand_back(current: ConvState) -> ConvState:
    return ConvState(state="idle", agent_paused=False, grace_deadline=None)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_state.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/state.py agent/concierge/tests/test_state.py
git commit -m "Add concierge conversation state machine"
```

---

### Task 5: Supabase adapter (ConciergeDB) and test fakes

**Files:**
- Create: `agent/concierge/concierge/db.py`
- Create: `agent/concierge/tests/fakes.py`
- Test: `agent/concierge/tests/test_fakes.py`

**Interfaces:**
- Produces: class `ConciergeDB` (real, Supabase-backed) and class `FakeDB` (in-memory, identical method signatures) plus `FakeGateway`. Tasks 7, 8, 9, 10 depend on these exact signatures:

```python
resolve_channel(channel: str, address: str) -> dict | None
primary_address(client_id: str, channel: str) -> str | None
get_or_create_conversation(client_id: str, channel: str) -> dict
get_conversation(conversation_id: str) -> dict | None
insert_inbound(conversation_id: str, body: str, twilio_sid: str) -> bool  # False on duplicate sid
quarantine(channel: str, address: str, body: str, twilio_sid: str) -> None  # duplicate sid is a no-op
apply_state(conversation_id: str, new: ConvState, last_inbound_at: datetime | None = None) -> None
fetch_expired_graces(now: datetime) -> list[dict]
fetch_due_outbound(now: datetime, limit: int = 10) -> list[dict]
mark_sending(message_id: str) -> None
mark_sent(message_id: str, twilio_sid: str, now: datetime) -> None
record_send_failure(message_id: str, error: str, attempts: int, next_attempt_at: datetime | None, terminal: bool) -> None
mark_cancelled(message_id: str) -> None
meg_activity_since(conversation_id: str, since: str) -> bool  # since is an ISO string
set_delivery_status(twilio_sid: str, status: str, now: datetime) -> dict | None  # returns updated message row
flag_conversation_for_meg(conversation_id: str) -> None
latest_inbound_at() -> datetime | None
heartbeat(service: str) -> None
```

- Row dicts use DB column names; all timestamps in rows are ISO strings (use `concierge.timeutil.parse_ts` to compare).
- `FakeGateway` produces: `send(channel, to_address, body, status_callback) -> str` (returns fake sid, raises `RuntimeError("twilio down")` while `fail_next > 0`), `validate_signature(url, params, signature) -> bool` (returns `self.valid_signature`), `list_recent_inbound(since) -> list[InboundMessage]` (returns `self.inbound_history`), and records every send in `self.sent`.

- [ ] **Step 1: Write the failing tests (they exercise FakeDB, which locks the contract all later tasks rely on)**

`agent/concierge/tests/test_fakes.py`:

```python
from datetime import datetime, timedelta, timezone

import pytest

from concierge.state import ConvState
from concierge.timeutil import iso, parse_ts
from tests.fakes import FakeDB, FakeGateway

NOW = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)


def make_db() -> FakeDB:
    db = FakeDB()
    db.add_client("client-1")
    db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    return db


def test_resolve_channel_hit_and_miss():
    db = make_db()
    hit = db.resolve_channel("whatsapp", "+447700900123")
    assert hit is not None and hit["client_id"] == "client-1"
    assert db.resolve_channel("sms", "+447700900123") is None


def test_primary_address():
    db = make_db()
    assert db.primary_address("client-1", "whatsapp") == "+447700900123"
    assert db.primary_address("client-1", "sms") is None


def test_get_or_create_conversation_is_idempotent():
    db = make_db()
    a = db.get_or_create_conversation("client-1", "whatsapp")
    b = db.get_or_create_conversation("client-1", "whatsapp")
    assert a["id"] == b["id"]
    assert a["state"] == "idle"
    assert a["grace_seconds"] == 240


def test_insert_inbound_rejects_duplicate_sid():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    assert db.insert_inbound(conv["id"], "hello", "SM001") is True
    assert db.insert_inbound(conv["id"], "hello again", "SM001") is False


def test_apply_state_persists_transition():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    new = ConvState(state="awaiting_meg", agent_paused=False, grace_deadline=NOW)
    db.apply_state(conv["id"], new, last_inbound_at=NOW)
    row = db.get_conversation(conv["id"])
    assert row["state"] == "awaiting_meg"
    assert parse_ts(row["grace_deadline"]) == NOW
    assert parse_ts(row["last_inbound_at"]) == NOW


def test_fetch_expired_graces_filters_correctly():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    db.apply_state(conv["id"], ConvState("awaiting_meg", False, NOW))
    assert db.fetch_expired_graces(NOW - timedelta(seconds=1)) == []
    expired = db.fetch_expired_graces(NOW + timedelta(seconds=1))
    assert [c["id"] for c in expired] == [conv["id"]]


def test_outbound_queue_lifecycle():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    msg_id = db.queue_outbound(conv["id"], author="meg", body="On it!")
    due = db.fetch_due_outbound(NOW)
    assert [m["id"] for m in due] == [msg_id]
    db.mark_sending(msg_id)
    assert db.fetch_due_outbound(NOW) == []
    db.mark_sent(msg_id, "SM100", NOW)
    row = db.get_message(msg_id)
    assert row["status"] == "sent" and row["twilio_sid"] == "SM100"


def test_record_send_failure_backoff_and_terminal():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    msg_id = db.queue_outbound(conv["id"], author="meg", body="x")
    retry_at = NOW + timedelta(seconds=20)
    db.record_send_failure(msg_id, "boom", attempts=1, next_attempt_at=retry_at, terminal=False)
    row = db.get_message(msg_id)
    assert row["status"] == "queued" and row["send_attempts"] == 1
    assert db.fetch_due_outbound(NOW) == []  # not due yet
    assert [m["id"] for m in db.fetch_due_outbound(retry_at)] == [msg_id]
    db.record_send_failure(msg_id, "boom", attempts=5, next_attempt_at=None, terminal=True)
    assert db.get_message(msg_id)["status"] == "failed"


def test_meg_activity_since():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    since = iso(NOW)
    assert db.meg_activity_since(conv["id"], since) is False
    db.queue_outbound(conv["id"], author="meg", body="I am here", created_at=NOW + timedelta(seconds=5))
    assert db.meg_activity_since(conv["id"], since) is True


def test_set_delivery_status_and_flag_for_meg():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    msg_id = db.queue_outbound(conv["id"], author="agent", body="x")
    db.mark_sent(msg_id, "SM200", NOW)
    row = db.set_delivery_status("SM200", "failed", NOW)
    assert row["id"] == msg_id
    db.flag_conversation_for_meg(conv["id"])
    c = db.get_conversation(conv["id"])
    assert c["state"] == "meg_active" and c["agent_paused"] is True
    assert db.set_delivery_status("SM-missing", "delivered", NOW) is None


def test_quarantine_duplicate_sid_is_noop():
    db = make_db()
    db.quarantine("sms", "+15550009999", "who dis", "SM300")
    db.quarantine("sms", "+15550009999", "who dis", "SM300")
    assert len(db.quarantined) == 1


def test_latest_inbound_at():
    db = make_db()
    assert db.latest_inbound_at() is None
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    db.insert_inbound(conv["id"], "hi", "SM400", created_at=NOW)
    assert db.latest_inbound_at() == NOW


def test_fake_gateway_send_and_failure_modes():
    gw = FakeGateway()
    sid = gw.send("whatsapp", "+447700900123", "hello", "https://x/twilio/status")
    assert sid.startswith("SM") and len(gw.sent) == 1
    assert gw.sent[0]["to_address"] == "+447700900123"
    gw.fail_next = 1
    with pytest.raises(RuntimeError):
        gw.send("sms", "+1", "x", "cb")
    assert gw.validate_signature("u", {}, "s") is True
    gw.valid_signature = False
    assert gw.validate_signature("u", {}, "s") is False
```

Note: `queue_outbound`, `get_message`, `add_client`, `add_channel`, and the optional `created_at` kwargs are test conveniences on `FakeDB` (the dashboard does the real outbound inserts in production; the daemon only reads them). `ConciergeDB` does not need `queue_outbound`, `get_message`, `add_client`, or `add_channel`.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_fakes.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'tests.fakes'`.

- [ ] **Step 3: Implement the fakes**

`agent/concierge/tests/fakes.py`:

```python
"""In-memory doubles matching ConciergeDB and TwilioGateway signatures exactly."""
import itertools
from datetime import datetime, timezone

from concierge.channels import InboundMessage
from concierge.state import ConvState
from concierge.timeutil import iso, parse_ts

_ids = itertools.count(1)


def _next_id(prefix: str) -> str:
    return f"{prefix}-{next(_ids)}"


def _now_iso() -> str:
    return iso(datetime.now(timezone.utc))


class FakeDB:
    def __init__(self) -> None:
        self.clients: dict[str, dict] = {}
        self.channels: list[dict] = []
        self.conversations: dict[str, dict] = {}
        self.messages: dict[str, dict] = {}
        self.quarantined: list[dict] = []
        self.heartbeats: dict[str, str] = {}

    # test-setup conveniences (not on ConciergeDB)
    def add_client(self, client_id: str) -> None:
        self.clients[client_id] = {"id": client_id}

    def add_channel(self, client_id: str, channel: str, address: str, is_primary: bool = False) -> None:
        self.channels.append(
            {"id": _next_id("ch"), "client_id": client_id, "channel": channel,
             "address": address, "is_primary": is_primary}
        )

    def queue_outbound(self, conversation_id: str, author: str, body: str,
                       created_at: datetime | None = None) -> str:
        mid = _next_id("msg")
        self.messages[mid] = {
            "id": mid, "conversation_id": conversation_id, "direction": "outbound",
            "author": author, "body": body, "twilio_sid": None, "status": "queued",
            "error": None, "send_attempts": 0, "next_attempt_at": None,
            "created_at": iso(created_at) if created_at else _now_iso(),
            "sent_at": None, "delivered_at": None,
        }
        return mid

    def get_message(self, message_id: str) -> dict | None:
        return self.messages.get(message_id)

    # ConciergeDB contract
    def resolve_channel(self, channel: str, address: str) -> dict | None:
        for ch in self.channels:
            if ch["channel"] == channel and ch["address"] == address:
                return dict(ch)
        return None

    def primary_address(self, client_id: str, channel: str) -> str | None:
        rows = [c for c in self.channels if c["client_id"] == client_id and c["channel"] == channel]
        for c in rows:
            if c["is_primary"]:
                return c["address"]
        return rows[0]["address"] if rows else None

    def get_or_create_conversation(self, client_id: str, channel: str) -> dict:
        for conv in self.conversations.values():
            if conv["client_id"] == client_id and conv["channel"] == channel:
                return dict(conv)
        cid = _next_id("conv")
        conv = {
            "id": cid, "client_id": client_id, "channel": channel, "state": "idle",
            "agent_paused": False, "grace_deadline": None, "grace_seconds": 240,
            "rolling_summary": None, "last_inbound_at": None,
            "created_at": _now_iso(), "updated_at": _now_iso(),
        }
        self.conversations[cid] = conv
        return dict(conv)

    def get_conversation(self, conversation_id: str) -> dict | None:
        conv = self.conversations.get(conversation_id)
        return dict(conv) if conv else None

    def insert_inbound(self, conversation_id: str, body: str, twilio_sid: str,
                       created_at: datetime | None = None) -> bool:
        if any(m["twilio_sid"] == twilio_sid for m in self.messages.values()):
            return False
        mid = _next_id("msg")
        self.messages[mid] = {
            "id": mid, "conversation_id": conversation_id, "direction": "inbound",
            "author": "client", "body": body, "twilio_sid": twilio_sid,
            "status": "received", "error": None, "send_attempts": 0,
            "next_attempt_at": None,
            "created_at": iso(created_at) if created_at else _now_iso(),
            "sent_at": None, "delivered_at": None,
        }
        return True

    def quarantine(self, channel: str, address: str, body: str, twilio_sid: str) -> None:
        if any(q["twilio_sid"] == twilio_sid for q in self.quarantined):
            return
        self.quarantined.append(
            {"id": _next_id("q"), "channel": channel, "address": address,
             "body": body, "twilio_sid": twilio_sid, "received_at": _now_iso(),
             "claimed_client_id": None}
        )

    def apply_state(self, conversation_id: str, new: ConvState,
                    last_inbound_at: datetime | None = None) -> None:
        conv = self.conversations[conversation_id]
        conv["state"] = new.state
        conv["agent_paused"] = new.agent_paused
        conv["grace_deadline"] = iso(new.grace_deadline) if new.grace_deadline else None
        conv["updated_at"] = _now_iso()
        if last_inbound_at is not None:
            conv["last_inbound_at"] = iso(last_inbound_at)

    def fetch_expired_graces(self, now: datetime) -> list[dict]:
        out = []
        for conv in self.conversations.values():
            deadline = parse_ts(conv["grace_deadline"])
            if (conv["state"] == "awaiting_meg" and not conv["agent_paused"]
                    and deadline is not None and deadline <= now):
                out.append(dict(conv))
        return out

    def fetch_due_outbound(self, now: datetime, limit: int = 10) -> list[dict]:
        due = []
        for m in self.messages.values():
            if m["status"] != "queued":
                continue
            next_at = parse_ts(m["next_attempt_at"])
            if next_at is not None and next_at > now:
                continue
            due.append(dict(m))
        due.sort(key=lambda m: m["created_at"])
        return due[:limit]

    def mark_sending(self, message_id: str) -> None:
        self.messages[message_id]["status"] = "sending"

    def mark_sent(self, message_id: str, twilio_sid: str, now: datetime) -> None:
        m = self.messages[message_id]
        m["status"] = "sent"
        m["twilio_sid"] = twilio_sid
        m["sent_at"] = iso(now)

    def record_send_failure(self, message_id: str, error: str, attempts: int,
                            next_attempt_at: datetime | None, terminal: bool) -> None:
        m = self.messages[message_id]
        m["error"] = error
        m["send_attempts"] = attempts
        m["next_attempt_at"] = iso(next_attempt_at) if next_attempt_at else None
        m["status"] = "failed" if terminal else "queued"

    def mark_cancelled(self, message_id: str) -> None:
        self.messages[message_id]["status"] = "cancelled"

    def meg_activity_since(self, conversation_id: str, since: str) -> bool:
        cutoff = parse_ts(since)
        for m in self.messages.values():
            if (m["conversation_id"] == conversation_id and m["author"] == "meg"
                    and parse_ts(m["created_at"]) > cutoff):
                return True
        return False

    def set_delivery_status(self, twilio_sid: str, status: str, now: datetime) -> dict | None:
        for m in self.messages.values():
            if m["twilio_sid"] == twilio_sid:
                m["status"] = status
                if status == "delivered":
                    m["delivered_at"] = iso(now)
                return dict(m)
        return None

    def flag_conversation_for_meg(self, conversation_id: str) -> None:
        conv = self.conversations[conversation_id]
        conv["state"] = "meg_active"
        conv["agent_paused"] = True
        conv["grace_deadline"] = None
        conv["updated_at"] = _now_iso()

    def latest_inbound_at(self) -> datetime | None:
        times = [parse_ts(m["created_at"]) for m in self.messages.values()
                 if m["direction"] == "inbound"]
        return max(times) if times else None

    def heartbeat(self, service: str) -> None:
        self.heartbeats[service] = _now_iso()


class FakeGateway:
    def __init__(self, valid_signature: bool = True) -> None:
        self.valid_signature = valid_signature
        self.sent: list[dict] = []
        self.fail_next = 0
        self.inbound_history: list[InboundMessage] = []

    def send(self, channel: str, to_address: str, body: str, status_callback: str) -> str:
        if self.fail_next > 0:
            self.fail_next -= 1
            raise RuntimeError("twilio down")
        sid = f"SM{len(self.sent) + 1:04d}"
        self.sent.append({"channel": channel, "to_address": to_address,
                          "body": body, "status_callback": status_callback, "sid": sid})
        return sid

    def validate_signature(self, url: str, params: dict, signature: str) -> bool:
        return self.valid_signature

    def list_recent_inbound(self, since: datetime) -> list[InboundMessage]:
        return list(self.inbound_history)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_fakes.py -v`
Expected: all PASS.

- [ ] **Step 5: Implement the real ConciergeDB**

`agent/concierge/concierge/db.py`:

```python
"""Supabase adapter. Thin: SQL-shaped calls only, no business logic here."""
import logging
from datetime import datetime, timezone

from postgrest.exceptions import APIError
from supabase import Client, create_client

from concierge.config import Config
from concierge.state import ConvState
from concierge.timeutil import iso, parse_ts

logger = logging.getLogger(__name__)

_UNIQUE_VIOLATION = "23505"


def _ts(dt: datetime) -> str:
    """Z-suffixed ISO string: unambiguous in PostgREST filter params and column writes."""
    return iso(dt).replace("+00:00", "Z")


def _now_ts() -> str:
    return _ts(datetime.now(timezone.utc))


class ConciergeDB:
    def __init__(self, cfg: Config) -> None:
        self._client: Client = create_client(cfg.supabase_url, cfg.supabase_service_key)

    def resolve_channel(self, channel: str, address: str) -> dict | None:
        res = (self._client.table("client_channels").select("*")
               .eq("channel", channel).eq("address", address).limit(1).execute())
        return res.data[0] if res.data else None

    def primary_address(self, client_id: str, channel: str) -> str | None:
        res = (self._client.table("client_channels").select("address,is_primary")
               .eq("client_id", client_id).eq("channel", channel).execute())
        if not res.data:
            return None
        for row in res.data:
            if row["is_primary"]:
                return row["address"]
        return res.data[0]["address"]

    def get_or_create_conversation(self, client_id: str, channel: str) -> dict:
        res = (self._client.table("conversations").select("*")
               .eq("client_id", client_id).eq("channel", channel).limit(1).execute())
        if res.data:
            return res.data[0]
        try:
            ins = (self._client.table("conversations")
                   .insert({"client_id": client_id, "channel": channel}).execute())
            return ins.data[0]
        except APIError as exc:
            if exc.code == _UNIQUE_VIOLATION:  # lost a race; fetch the winner
                res = (self._client.table("conversations").select("*")
                       .eq("client_id", client_id).eq("channel", channel).limit(1).execute())
                return res.data[0]
            raise

    def get_conversation(self, conversation_id: str) -> dict | None:
        res = (self._client.table("conversations").select("*")
               .eq("id", conversation_id).limit(1).execute())
        return res.data[0] if res.data else None

    def insert_inbound(self, conversation_id: str, body: str, twilio_sid: str) -> bool:
        try:
            (self._client.table("messages").insert({
                "conversation_id": conversation_id, "direction": "inbound",
                "author": "client", "body": body, "twilio_sid": twilio_sid,
                "status": "received",
            }).execute())
            return True
        except APIError as exc:
            if exc.code == _UNIQUE_VIOLATION:
                return False
            raise

    def quarantine(self, channel: str, address: str, body: str, twilio_sid: str) -> None:
        try:
            (self._client.table("quarantined_messages").insert({
                "channel": channel, "address": address, "body": body,
                "twilio_sid": twilio_sid,
            }).execute())
        except APIError as exc:
            if exc.code != _UNIQUE_VIOLATION:
                raise

    def apply_state(self, conversation_id: str, new: ConvState,
                    last_inbound_at: datetime | None = None) -> None:
        patch: dict = {
            "state": new.state,
            "agent_paused": new.agent_paused,
            "grace_deadline": _ts(new.grace_deadline) if new.grace_deadline else None,
            "updated_at": _now_ts(),
        }
        if last_inbound_at is not None:
            patch["last_inbound_at"] = _ts(last_inbound_at)
        self._client.table("conversations").update(patch).eq("id", conversation_id).execute()

    def fetch_expired_graces(self, now: datetime) -> list[dict]:
        res = (self._client.table("conversations").select("*")
               .eq("state", "awaiting_meg").eq("agent_paused", False)
               .lte("grace_deadline", _ts(now)).execute())
        return res.data or []

    def fetch_due_outbound(self, now: datetime, limit: int = 10) -> list[dict]:
        res = (self._client.table("messages").select("*")
               .eq("status", "queued")
               .or_(f"next_attempt_at.is.null,next_attempt_at.lte.{_ts(now)}")
               .order("created_at").limit(limit).execute())
        return res.data or []

    def mark_sending(self, message_id: str) -> None:
        self._client.table("messages").update({"status": "sending"}).eq("id", message_id).execute()

    def mark_sent(self, message_id: str, twilio_sid: str, now: datetime) -> None:
        (self._client.table("messages").update({
            "status": "sent", "twilio_sid": twilio_sid, "sent_at": _ts(now),
        }).eq("id", message_id).execute())

    def record_send_failure(self, message_id: str, error: str, attempts: int,
                            next_attempt_at: datetime | None, terminal: bool) -> None:
        (self._client.table("messages").update({
            "error": error,
            "send_attempts": attempts,
            "next_attempt_at": _ts(next_attempt_at) if next_attempt_at else None,
            "status": "failed" if terminal else "queued",
        }).eq("id", message_id).execute())

    def mark_cancelled(self, message_id: str) -> None:
        self._client.table("messages").update({"status": "cancelled"}).eq("id", message_id).execute()

    def meg_activity_since(self, conversation_id: str, since: str) -> bool:
        res = (self._client.table("messages").select("id")
               .eq("conversation_id", conversation_id).eq("author", "meg")
               .gt("created_at", since).limit(1).execute())
        return bool(res.data)

    def set_delivery_status(self, twilio_sid: str, status: str, now: datetime) -> dict | None:
        patch: dict = {"status": status}
        if status == "delivered":
            patch["delivered_at"] = _ts(now)
        res = (self._client.table("messages").update(patch)
               .eq("twilio_sid", twilio_sid).execute())
        return res.data[0] if res.data else None

    def flag_conversation_for_meg(self, conversation_id: str) -> None:
        (self._client.table("conversations").update({
            "state": "meg_active", "agent_paused": True, "grace_deadline": None,
            "updated_at": _now_ts(),
        }).eq("id", conversation_id).execute())

    def latest_inbound_at(self) -> datetime | None:
        res = (self._client.table("messages").select("created_at")
               .eq("direction", "inbound").order("created_at", desc=True)
               .limit(1).execute())
        return parse_ts(res.data[0]["created_at"]) if res.data else None

    def heartbeat(self, service: str) -> None:
        try:
            (self._client.table("service_heartbeats")
             .upsert({"service": service, "beat_at": _now_ts()}).execute())
        except APIError:
            logger.exception("heartbeat write failed")
```

- [ ] **Step 6: Verify everything still passes and the module imports**

Run: `python -m pytest tests/ -v && python -c "import concierge.db"`
Expected: all tests PASS; import prints nothing.

Note: `ConciergeDB` has no unit tests by design. It is a thin adapter; its behaviour is verified live in Task 12's smoke test. All logic that can be wrong lives in the pure modules and is tested against `FakeDB`, whose contract `test_fakes.py` locks down.

- [ ] **Step 7: Commit**

```bash
git add agent/concierge/concierge/db.py agent/concierge/tests/fakes.py agent/concierge/tests/test_fakes.py
git commit -m "Add concierge Supabase adapter and in-memory test fakes"
```

---

### Task 6: Twilio gateway wrapper

**Files:**
- Create: `agent/concierge/concierge/twilio_gateway.py`
- Test: `agent/concierge/tests/test_twilio_gateway.py`

**Interfaces:**
- Consumes: `Config` (Task 2), `InboundMessage`, `to_twilio_address` (Task 3).
- Produces: class `TwilioGateway` with `__init__(cfg: Config)`, `send(channel: str, to_address: str, body: str, status_callback: str) -> str`, `validate_signature(url: str, params: dict, signature: str) -> bool`, `list_recent_inbound(since: datetime) -> list[InboundMessage]`. Task 11 constructs it; Tasks 7, 8, 10 receive it (or `FakeGateway`) by injection.

- [ ] **Step 1: Write the failing test**

`agent/concierge/tests/test_twilio_gateway.py`:

```python
from twilio.request_validator import RequestValidator

from concierge.config import Config
from concierge.twilio_gateway import TwilioGateway

CFG = Config(
    supabase_url="https://example.supabase.co",
    supabase_service_key="svc",
    twilio_account_sid="AC" + "0" * 32,
    twilio_auth_token="token123",
    twilio_whatsapp_from="whatsapp:+447700900000",
    twilio_sms_from="+15550001111",
    public_base_url="https://tlo-concierge.example.com",
)


def test_validate_signature_accepts_valid_signature():
    gw = TwilioGateway(CFG)
    url = "https://tlo-concierge.example.com/twilio/inbound"
    params = {"From": "whatsapp:+447700900123", "Body": "Hi", "MessageSid": "SM1"}
    good = RequestValidator("token123").compute_signature(url, params)
    assert gw.validate_signature(url, params, good) is True


def test_validate_signature_rejects_bad_signature():
    gw = TwilioGateway(CFG)
    url = "https://tlo-concierge.example.com/twilio/inbound"
    assert gw.validate_signature(url, {"Body": "Hi"}, "not-a-real-signature") is False


def test_from_number_selection():
    gw = TwilioGateway(CFG)
    assert gw.from_number("whatsapp") == "whatsapp:+447700900000"
    assert gw.from_number("sms") == "+15550001111"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_twilio_gateway.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.twilio_gateway'`.

- [ ] **Step 3: Implement**

`agent/concierge/concierge/twilio_gateway.py`:

```python
"""Twilio wrapper: the only module allowed to import the twilio SDK."""
from datetime import datetime

from twilio.request_validator import RequestValidator
from twilio.rest import Client

from concierge.channels import InboundMessage, to_twilio_address
from concierge.config import Config

_WHATSAPP_PREFIX = "whatsapp:"


class TwilioGateway:
    def __init__(self, cfg: Config) -> None:
        self._client = Client(cfg.twilio_account_sid, cfg.twilio_auth_token)
        self._validator = RequestValidator(cfg.twilio_auth_token)
        self._whatsapp_from = cfg.twilio_whatsapp_from
        self._sms_from = cfg.twilio_sms_from

    def from_number(self, channel: str) -> str:
        return self._whatsapp_from if channel == "whatsapp" else self._sms_from

    def send(self, channel: str, to_address: str, body: str, status_callback: str) -> str:
        message = self._client.messages.create(
            from_=self.from_number(channel),
            to=to_twilio_address(channel, to_address),
            body=body,
            status_callback=status_callback,
        )
        return message.sid

    def validate_signature(self, url: str, params: dict, signature: str) -> bool:
        return bool(self._validator.validate(url, params, signature))

    def list_recent_inbound(self, since: datetime) -> list[InboundMessage]:
        out: list[InboundMessage] = []
        for m in self._client.messages.list(date_sent_after=since, limit=200):
            if m.direction != "inbound":
                continue
            raw = m.from_ or ""
            if raw.startswith(_WHATSAPP_PREFIX):
                channel, address = "whatsapp", raw[len(_WHATSAPP_PREFIX):]
            else:
                channel, address = "sms", raw
            out.append(InboundMessage(channel=channel, address=address,
                                      body=m.body or "", twilio_sid=m.sid))
        return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_twilio_gateway.py -v`
Expected: all PASS (constructing `Client` makes no network calls).

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/twilio_gateway.py agent/concierge/tests/test_twilio_gateway.py
git commit -m "Add Twilio gateway wrapper with signature validation"
```

---

### Task 7: Webhook receiver (FastAPI app)

**Files:**
- Create: `agent/concierge/concierge/webhook.py`
- Test: `agent/concierge/tests/test_webhook.py`

**Interfaces:**
- Consumes: `parse_inbound` (Task 3), `ConvState`/`on_inbound` (Task 4), the DB contract and `FakeDB`/`FakeGateway` (Task 5), `Config` (Task 2), `parse_ts` (Task 2).
- Produces: `create_app(db, gateway, cfg) -> FastAPI` with routes `POST /twilio/inbound`, `POST /twilio/status`, `GET /health`. Task 11 mounts it.

- [ ] **Step 1: Write the failing test**

`agent/concierge/tests/test_webhook.py`:

```python
from fastapi.testclient import TestClient

from concierge.config import Config
from concierge.timeutil import parse_ts
from concierge.webhook import create_app
from tests.fakes import FakeDB, FakeGateway

CFG = Config(
    supabase_url="https://example.supabase.co",
    supabase_service_key="svc",
    twilio_account_sid="AC123",
    twilio_auth_token="tok",
    twilio_whatsapp_from="whatsapp:+447700900000",
    twilio_sms_from="+15550001111",
    public_base_url="https://tlo-concierge.example.com",
)


def make_client(db: FakeDB | None = None, gateway: FakeGateway | None = None):
    db = db or FakeDB()
    gateway = gateway or FakeGateway()
    app = create_app(db, gateway, CFG)
    return TestClient(app), db, gateway


def known_client_db() -> FakeDB:
    db = FakeDB()
    db.add_client("client-1")
    db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    return db


INBOUND_FORM = {"From": "whatsapp:+447700900123", "Body": "Hi Meg", "MessageSid": "SM001"}


def test_health():
    client, _, _ = make_client()
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_inbound_from_known_client_stores_message_and_arms_grace():
    client, db, _ = make_client(known_client_db())
    res = client.post("/twilio/inbound", data=INBOUND_FORM)
    assert res.status_code == 200
    assert "<Response" in res.text
    convs = list(db.conversations.values())
    assert len(convs) == 1
    conv = convs[0]
    assert conv["state"] == "awaiting_meg"
    assert parse_ts(conv["grace_deadline"]) is not None
    stored = [m for m in db.messages.values() if m["twilio_sid"] == "SM001"]
    assert len(stored) == 1 and stored[0]["body"] == "Hi Meg"


def test_inbound_duplicate_sid_is_idempotent():
    client, db, _ = make_client(known_client_db())
    client.post("/twilio/inbound", data=INBOUND_FORM)
    res = client.post("/twilio/inbound", data=INBOUND_FORM)
    assert res.status_code == 200
    assert len([m for m in db.messages.values() if m["twilio_sid"] == "SM001"]) == 1


def test_inbound_from_unknown_number_is_quarantined():
    client, db, _ = make_client()  # no clients registered
    form = {"From": "+15550009999", "Body": "who dis", "MessageSid": "SM002"}
    res = client.post("/twilio/inbound", data=form)
    assert res.status_code == 200
    assert len(db.quarantined) == 1
    assert db.quarantined[0]["address"] == "+15550009999"
    assert db.conversations == {}


def test_inbound_with_invalid_signature_is_rejected():
    client, db, _ = make_client(known_client_db(), FakeGateway(valid_signature=False))
    res = client.post("/twilio/inbound", data=INBOUND_FORM)
    assert res.status_code == 403
    assert db.messages == {}


def test_inbound_while_meg_active_does_not_arm_timer():
    db = known_client_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    db.flag_conversation_for_meg(conv["id"])
    client, db, _ = make_client(db)
    client.post("/twilio/inbound", data=INBOUND_FORM)
    row = db.get_conversation(conv["id"])
    assert row["state"] == "meg_active"
    assert row["grace_deadline"] is None


def test_status_delivered_updates_message():
    db = known_client_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    mid = db.queue_outbound(conv["id"], author="meg", body="On it")
    from datetime import datetime, timezone
    db.mark_sent(mid, "SM100", datetime.now(timezone.utc))
    client, db, _ = make_client(db)
    res = client.post("/twilio/status", data={"MessageSid": "SM100", "MessageStatus": "delivered"})
    assert res.status_code == 200
    assert db.get_message(mid)["status"] == "delivered"


def test_status_failed_flags_conversation_for_meg():
    db = known_client_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    mid = db.queue_outbound(conv["id"], author="agent", body="x")
    from datetime import datetime, timezone
    db.mark_sent(mid, "SM101", datetime.now(timezone.utc))
    client, db, _ = make_client(db)
    client.post("/twilio/status", data={"MessageSid": "SM101", "MessageStatus": "failed"})
    assert db.get_message(mid)["status"] == "failed"
    row = db.get_conversation(conv["id"])
    assert row["state"] == "meg_active" and row["agent_paused"] is True


def test_status_for_unknown_sid_is_noop():
    client, db, _ = make_client()
    res = client.post("/twilio/status", data={"MessageSid": "SM404", "MessageStatus": "delivered"})
    assert res.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_webhook.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.webhook'`.

- [ ] **Step 3: Implement**

`agent/concierge/concierge/webhook.py`:

```python
"""FastAPI webhook receiver. Twilio posts urlencoded forms; we answer empty TwiML."""
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request, Response

from concierge.channels import parse_inbound
from concierge.config import Config
from concierge.state import ConvState, on_inbound
from concierge.timeutil import parse_ts

logger = logging.getLogger(__name__)


def _twiml_empty() -> Response:
    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="application/xml",
    )


def create_app(db, gateway, cfg: Config) -> FastAPI:
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    async def _validated_form(request: Request, path: str) -> dict[str, str]:
        form = {k: str(v) for k, v in (await request.form()).items()}
        signature = request.headers.get("X-Twilio-Signature", "")
        url = cfg.public_base_url + path
        if not gateway.validate_signature(url, form, signature):
            logger.warning("rejected webhook with invalid signature on %s", path)
            raise HTTPException(status_code=403, detail="invalid signature")
        return form

    @app.get("/health")
    async def health() -> dict:
        return {"ok": True}

    @app.post("/twilio/inbound")
    async def inbound(request: Request) -> Response:
        form = await _validated_form(request, "/twilio/inbound")
        msg = parse_inbound(form)
        channel_row = db.resolve_channel(msg.channel, msg.address)
        if channel_row is None:
            db.quarantine(msg.channel, msg.address, msg.body, msg.twilio_sid)
            logger.info("quarantined message from unknown %s number", msg.channel)
            return _twiml_empty()
        conv = db.get_or_create_conversation(channel_row["client_id"], msg.channel)
        if not db.insert_inbound(conv["id"], msg.body, msg.twilio_sid):
            return _twiml_empty()  # duplicate webhook delivery
        now = datetime.now(timezone.utc)
        current = ConvState(
            state=conv["state"],
            agent_paused=conv["agent_paused"],
            grace_deadline=parse_ts(conv.get("grace_deadline")),
        )
        grace_seconds = conv.get("grace_seconds") or cfg.grace_default_seconds
        db.apply_state(conv["id"], on_inbound(current, now, grace_seconds), last_inbound_at=now)
        return _twiml_empty()

    @app.post("/twilio/status")
    async def status(request: Request) -> Response:
        form = await _validated_form(request, "/twilio/status")
        sid = form.get("MessageSid", "")
        message_status = form.get("MessageStatus", "")
        now = datetime.now(timezone.utc)
        if message_status == "delivered":
            db.set_delivery_status(sid, "delivered", now)
        elif message_status in ("failed", "undelivered"):
            row = db.set_delivery_status(sid, "failed", now)
            if row is not None:
                db.flag_conversation_for_meg(row["conversation_id"])
                logger.warning("delivery failed for message %s; conversation flagged for Meg", sid)
        return _twiml_empty()

    return app
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_webhook.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/webhook.py agent/concierge/tests/test_webhook.py
git commit -m "Add concierge webhook receiver for Twilio inbound and status"
```

---

### Task 8: Outbound sender (single writer to Twilio)

**Files:**
- Create: `agent/concierge/concierge/sender.py`
- Test: `agent/concierge/tests/test_sender.py`

**Interfaces:**
- Consumes: DB contract + fakes (Task 5), gateway `send` (Task 6), `Config` (Task 2).
- Produces: `process_queued_once(db, gateway, cfg, now: datetime) -> int` (returns count sent; synchronous, fully testable) and `async sender_loop(db, gateway, cfg, stop: asyncio.Event) -> None`. Task 11 starts the loop.
- Spec rules encoded here (spec section 7): last-second Meg-race stand-down for agent-authored messages; retry with exponential backoff `now + 10 * 2^attempts` seconds; terminal failure after `cfg.max_send_attempts` flags the conversation for Meg.

- [ ] **Step 1: Write the failing test**

`agent/concierge/tests/test_sender.py`:

```python
from datetime import datetime, timedelta, timezone

from concierge.config import Config
from concierge.sender import process_queued_once
from tests.fakes import FakeDB, FakeGateway

NOW = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)

CFG = Config(
    supabase_url="u", supabase_service_key="k", twilio_account_sid="AC",
    twilio_auth_token="t", twilio_whatsapp_from="whatsapp:+440",
    twilio_sms_from="+10", public_base_url="https://cb.example.com",
    max_send_attempts=3,
)


def make_db() -> tuple[FakeDB, str]:
    db = FakeDB()
    db.add_client("client-1")
    db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    return db, conv["id"]


def test_sends_queued_meg_message():
    db, conv_id = make_db()
    mid = db.queue_outbound(conv_id, author="meg", body="On it!")
    gw = FakeGateway()
    assert process_queued_once(db, gw, CFG, NOW) == 1
    assert db.get_message(mid)["status"] == "sent"
    assert gw.sent[0]["to_address"] == "+447700900123"
    assert gw.sent[0]["channel"] == "whatsapp"
    assert gw.sent[0]["status_callback"] == "https://cb.example.com/twilio/status"


def test_agent_message_stands_down_when_meg_replied_after_it():
    db, conv_id = make_db()
    mid = db.queue_outbound(conv_id, author="agent", body="agent draft", created_at=NOW)
    db.queue_outbound(conv_id, author="meg", body="I am here",
                      created_at=NOW + timedelta(seconds=1))
    gw = FakeGateway()
    process_queued_once(db, gw, CFG, NOW + timedelta(seconds=2))
    assert db.get_message(mid)["status"] == "cancelled"
    sent_bodies = [s["body"] for s in gw.sent]
    assert "agent draft" not in sent_bodies
    assert "I am here" in sent_bodies  # Meg's own message still goes out


def test_agent_message_stands_down_when_conversation_paused():
    db, conv_id = make_db()
    mid = db.queue_outbound(conv_id, author="agent", body="x")
    db.flag_conversation_for_meg(conv_id)
    gw = FakeGateway()
    process_queued_once(db, gw, CFG, NOW)
    assert db.get_message(mid)["status"] == "cancelled"
    assert gw.sent == []


def test_send_failure_backs_off_then_goes_terminal():
    db, conv_id = make_db()
    mid = db.queue_outbound(conv_id, author="meg", body="x")
    gw = FakeGateway()

    gw.fail_next = 1
    process_queued_once(db, gw, CFG, NOW)
    row = db.get_message(mid)
    assert row["status"] == "queued" and row["send_attempts"] == 1
    assert row["next_attempt_at"] is not None
    # not due yet: nothing happens
    gw.fail_next = 1
    assert process_queued_once(db, gw, CFG, NOW + timedelta(seconds=1)) == 0

    gw.fail_next = 1
    process_queued_once(db, gw, CFG, NOW + timedelta(minutes=5))
    assert db.get_message(mid)["send_attempts"] == 2

    gw.fail_next = 1
    process_queued_once(db, gw, CFG, NOW + timedelta(minutes=30))
    row = db.get_message(mid)
    assert row["status"] == "failed" and row["send_attempts"] == 3  # max_send_attempts
    conv = db.get_conversation(conv_id)
    assert conv["state"] == "meg_active" and conv["agent_paused"] is True


def test_missing_address_is_terminal_failure():
    db = FakeDB()
    db.add_client("client-2")  # no channels registered
    conv = db.get_or_create_conversation("client-2", "sms")
    mid = db.queue_outbound(conv["id"], author="meg", body="x")
    gw = FakeGateway()
    process_queued_once(db, gw, CFG, NOW)
    assert db.get_message(mid)["status"] == "failed"
    assert gw.sent == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_sender.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.sender'`.

- [ ] **Step 3: Implement**

`agent/concierge/concierge/sender.py`:

```python
"""Outbound queue worker. The single writer to Twilio."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from concierge.config import Config

logger = logging.getLogger(__name__)


def process_queued_once(db, gateway, cfg: Config, now: datetime) -> int:
    sent_count = 0
    for row in db.fetch_due_outbound(now):
        conv = db.get_conversation(row["conversation_id"])
        if conv is None:
            db.mark_cancelled(row["id"])
            continue
        if row["author"] == "agent" and (
            conv["agent_paused"] or db.meg_activity_since(conv["id"], row["created_at"])
        ):
            db.mark_cancelled(row["id"])
            logger.info("agent message %s stood down (Meg is active)", row["id"])
            continue
        address = db.primary_address(conv["client_id"], conv["channel"])
        if address is None:
            db.record_send_failure(row["id"], "no channel address for client",
                                   attempts=cfg.max_send_attempts,
                                   next_attempt_at=None, terminal=True)
            db.flag_conversation_for_meg(conv["id"])
            logger.error("no %s address for client %s", conv["channel"], conv["client_id"])
            continue
        db.mark_sending(row["id"])
        try:
            sid = gateway.send(
                conv["channel"], address, row["body"],
                cfg.public_base_url + "/twilio/status",
            )
            db.mark_sent(row["id"], sid, now)
            sent_count += 1
        except Exception as exc:  # any Twilio/network error
            attempts = row["send_attempts"] + 1
            terminal = attempts >= cfg.max_send_attempts
            next_at = None if terminal else now + timedelta(seconds=10 * 2 ** attempts)
            db.record_send_failure(row["id"], str(exc), attempts, next_at, terminal)
            if terminal:
                db.flag_conversation_for_meg(conv["id"])
                logger.error("message %s failed terminally: %s", row["id"], exc)
            else:
                logger.warning("send attempt %d failed for %s: %s", attempts, row["id"], exc)
    return sent_count


async def sender_loop(db, gateway, cfg: Config, stop: asyncio.Event) -> None:
    while not stop.is_set():
        try:
            process_queued_once(db, gateway, cfg, datetime.now(timezone.utc))
        except Exception:
            logger.exception("sender loop iteration failed")
        try:
            await asyncio.wait_for(stop.wait(), timeout=cfg.poll_interval_seconds)
        except asyncio.TimeoutError:
            pass
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_sender.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/sender.py agent/concierge/tests/test_sender.py
git commit -m "Add outbound sender with Meg-race stand-down and backoff"
```

---

### Task 9: Grace scheduler and heartbeat

**Files:**
- Create: `agent/concierge/concierge/grace.py`
- Test: `agent/concierge/tests/test_grace.py`

**Interfaces:**
- Consumes: `on_grace_expired`, `ConvState` (Task 4), DB contract + fakes (Task 5), `Config` (Task 2), `parse_ts` (Task 2).
- Produces: `process_graces_once(db, on_agent_turn, now: datetime) -> int` (returns count fired), `log_agent_turn(conversation: dict) -> None` (Plan 1 stub handler; Plan 3 replaces it with the real agent), `async grace_loop(db, on_agent_turn, cfg, stop: asyncio.Event) -> None` (also beats the heartbeat each iteration, service name `tlo-concierge`). Task 11 starts the loop.

- [ ] **Step 1: Write the failing test**

`agent/concierge/tests/test_grace.py`:

```python
from datetime import datetime, timedelta, timezone

from concierge.grace import log_agent_turn, process_graces_once
from concierge.state import ConvState
from tests.fakes import FakeDB

NOW = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)


def make_db_with_waiting_conversation() -> tuple[FakeDB, str]:
    db = FakeDB()
    db.add_client("client-1")
    db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    db.apply_state(conv["id"], ConvState("awaiting_meg", False, NOW))
    return db, conv["id"]


def test_expired_grace_fires_handler_and_flips_state():
    db, conv_id = make_db_with_waiting_conversation()
    fired: list[str] = []
    count = process_graces_once(db, lambda conv: fired.append(conv["id"]), NOW + timedelta(seconds=1))
    assert count == 1
    assert fired == [conv_id]
    row = db.get_conversation(conv_id)
    assert row["state"] == "agent_active"
    assert row["grace_deadline"] is None


def test_unexpired_grace_does_not_fire():
    db, conv_id = make_db_with_waiting_conversation()
    fired: list[str] = []
    assert process_graces_once(db, lambda c: fired.append(c["id"]), NOW - timedelta(seconds=1)) == 0
    assert fired == []
    assert db.get_conversation(conv_id)["state"] == "awaiting_meg"


def test_fired_conversation_does_not_fire_twice():
    db, conv_id = make_db_with_waiting_conversation()
    later = NOW + timedelta(seconds=1)
    assert process_graces_once(db, lambda c: None, later) == 1
    assert process_graces_once(db, lambda c: None, later + timedelta(seconds=5)) == 0


def test_handler_exception_does_not_crash_processing():
    db, conv_id = make_db_with_waiting_conversation()

    def boom(conv: dict) -> None:
        raise RuntimeError("handler blew up")

    count = process_graces_once(db, boom, NOW + timedelta(seconds=1))
    assert count == 0  # not counted as fired
    assert db.get_conversation(conv_id)["state"] == "agent_active"  # state still applied


def test_log_agent_turn_is_a_safe_noop():
    log_agent_turn({"id": "conv-1"})  # must not raise
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_grace.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.grace'`.

- [ ] **Step 3: Implement**

`agent/concierge/concierge/grace.py`:

```python
"""Grace-window scheduler. Fires the agent-turn handler when Meg's window lapses."""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Callable

from concierge.config import Config
from concierge.state import ConvState, on_grace_expired
from concierge.timeutil import parse_ts

logger = logging.getLogger(__name__)

HEARTBEAT_SERVICE = "tlo-concierge"

AgentTurnHandler = Callable[[dict], None]


def log_agent_turn(conversation: dict) -> None:
    """Plan 1 stub. Plan 3 replaces this with the real agent turn runner."""
    logger.info(
        "agent turn needed for conversation %s (agent not yet implemented)",
        conversation.get("id"),
    )


def process_graces_once(db, on_agent_turn: AgentTurnHandler, now: datetime) -> int:
    fired = 0
    for conv in db.fetch_expired_graces(now):
        current = ConvState(
            state=conv["state"],
            agent_paused=conv["agent_paused"],
            grace_deadline=parse_ts(conv["grace_deadline"]),
        )
        new_state = on_grace_expired(current, now)
        if new_state is None:
            continue
        db.apply_state(conv["id"], new_state)
        try:
            on_agent_turn(conv)
            fired += 1
        except Exception:
            logger.exception("agent turn handler failed for conversation %s", conv["id"])
    return fired


async def grace_loop(db, on_agent_turn: AgentTurnHandler, cfg: Config,
                     stop: asyncio.Event) -> None:
    while not stop.is_set():
        try:
            process_graces_once(db, on_agent_turn, datetime.now(timezone.utc))
            db.heartbeat(HEARTBEAT_SERVICE)
        except Exception:
            logger.exception("grace loop iteration failed")
        try:
            await asyncio.wait_for(stop.wait(), timeout=cfg.poll_interval_seconds)
        except asyncio.TimeoutError:
            pass
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_grace.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/grace.py agent/concierge/tests/test_grace.py
git commit -m "Add grace-window scheduler with stub agent handler and heartbeat"
```

---

### Task 10: Startup reconciliation

**Files:**
- Create: `agent/concierge/concierge/reconcile.py`
- Test: `agent/concierge/tests/test_reconcile.py`

**Interfaces:**
- Consumes: `InboundMessage` (Task 3), `on_inbound`/`ConvState` (Task 4), DB contract + fakes (Task 5), gateway `list_recent_inbound` (Task 6), `Config` (Task 2).
- Produces: `reconcile_once(db, gateway, cfg, now: datetime) -> int` (returns count of recovered messages). Task 11 calls it once at startup.
- Spec rule (section 7): backstop for webhooks missed while the daemon was down. Looks back from the latest stored inbound minus a 1-hour overlap (or 24 hours if the DB is empty) and runs recovered messages through the same ingest path, idempotently.

- [ ] **Step 1: Write the failing test**

`agent/concierge/tests/test_reconcile.py`:

```python
from datetime import datetime, timedelta, timezone

from concierge.channels import InboundMessage
from concierge.config import Config
from concierge.reconcile import reconcile_once
from tests.fakes import FakeDB, FakeGateway

NOW = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)

CFG = Config(
    supabase_url="u", supabase_service_key="k", twilio_account_sid="AC",
    twilio_auth_token="t", twilio_whatsapp_from="whatsapp:+440",
    twilio_sms_from="+10", public_base_url="https://cb.example.com",
)


def make_db() -> FakeDB:
    db = FakeDB()
    db.add_client("client-1")
    db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    return db


def test_recovers_missed_message_and_arms_grace():
    db = make_db()
    gw = FakeGateway()
    gw.inbound_history = [
        InboundMessage("whatsapp", "+447700900123", "missed you", "SM900"),
    ]
    assert reconcile_once(db, gw, CFG, NOW) == 1
    stored = [m for m in db.messages.values() if m["twilio_sid"] == "SM900"]
    assert len(stored) == 1
    conv = list(db.conversations.values())[0]
    assert conv["state"] == "awaiting_meg"


def test_already_stored_message_is_skipped():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    db.insert_inbound(conv["id"], "already here", "SM900")
    gw = FakeGateway()
    gw.inbound_history = [
        InboundMessage("whatsapp", "+447700900123", "already here", "SM900"),
    ]
    assert reconcile_once(db, gw, CFG, NOW) == 0


def test_unknown_number_goes_to_quarantine():
    db = make_db()
    gw = FakeGateway()
    gw.inbound_history = [InboundMessage("sms", "+15550009999", "who dis", "SM901")]
    assert reconcile_once(db, gw, CFG, NOW) == 0
    assert len(db.quarantined) == 1


def test_gateway_error_is_swallowed():
    db = make_db()

    class BrokenGateway:
        def list_recent_inbound(self, since):
            raise RuntimeError("twilio api down")

    assert reconcile_once(db, BrokenGateway(), CFG, NOW) == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_reconcile.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.reconcile'`.

- [ ] **Step 3: Implement**

`agent/concierge/concierge/reconcile.py`:

```python
"""Startup backstop: recover inbound messages whose webhooks we missed while down."""
import logging
from datetime import datetime, timedelta

from concierge.config import Config
from concierge.state import ConvState, on_inbound
from concierge.timeutil import parse_ts

logger = logging.getLogger(__name__)

_OVERLAP = timedelta(hours=1)
_EMPTY_DB_LOOKBACK = timedelta(hours=24)


def reconcile_once(db, gateway, cfg: Config, now: datetime) -> int:
    latest = db.latest_inbound_at()
    since = (latest - _OVERLAP) if latest else (now - _EMPTY_DB_LOOKBACK)
    try:
        recent = gateway.list_recent_inbound(since)
    except Exception:
        logger.exception("reconciliation fetch from Twilio failed; continuing without it")
        return 0
    recovered = 0
    for msg in recent:
        channel_row = db.resolve_channel(msg.channel, msg.address)
        if channel_row is None:
            db.quarantine(msg.channel, msg.address, msg.body, msg.twilio_sid)
            continue
        conv = db.get_or_create_conversation(channel_row["client_id"], msg.channel)
        if not db.insert_inbound(conv["id"], msg.body, msg.twilio_sid):
            continue  # already stored via webhook
        current = ConvState(
            state=conv["state"],
            agent_paused=conv["agent_paused"],
            grace_deadline=parse_ts(conv.get("grace_deadline")),
        )
        grace_seconds = conv.get("grace_seconds") or cfg.grace_default_seconds
        db.apply_state(conv["id"], on_inbound(current, now, grace_seconds), last_inbound_at=now)
        recovered += 1
        logger.info("recovered missed inbound %s for conversation %s", msg.twilio_sid, conv["id"])
    return recovered
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_reconcile.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/reconcile.py agent/concierge/tests/test_reconcile.py
git commit -m "Add startup reconciliation against the Twilio message log"
```

---

### Task 11: Entrypoint and README

**Files:**
- Create: `agent/concierge/concierge/run.py`
- Create: `agent/concierge/README.md`

**Interfaces:**
- Consumes: everything above: `load_config` (Task 2), `ConciergeDB` (Task 5), `TwilioGateway` (Task 6), `create_app` (Task 7), `sender_loop` (Task 8), `grace_loop`/`log_agent_turn` (Task 9), `reconcile_once` (Task 10).
- Produces: `python -m concierge.run` starts the daemon: reconcile once, then uvicorn on `127.0.0.1:$PORT` with the sender and grace loops as background tasks.

- [ ] **Step 1: Implement the entrypoint** (no unit test: it is pure wiring of already-tested parts; verified by the import smoke check below and live in Task 12)

`agent/concierge/concierge/run.py`:

```python
"""Daemon entrypoint: python -m concierge.run"""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn

from concierge.config import load_config
from concierge.db import ConciergeDB
from concierge.grace import grace_loop, log_agent_turn
from concierge.reconcile import reconcile_once
from concierge.sender import sender_loop
from concierge.twilio_gateway import TwilioGateway
from concierge.webhook import create_app


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger = logging.getLogger("concierge.run")
    cfg = load_config()
    db = ConciergeDB(cfg)
    gateway = TwilioGateway(cfg)

    recovered = reconcile_once(db, gateway, cfg, datetime.now(timezone.utc))
    logger.info("startup reconciliation recovered %d message(s)", recovered)

    app = create_app(db, gateway, cfg)

    @asynccontextmanager
    async def lifespan(_app):
        stop = asyncio.Event()
        tasks = [
            asyncio.create_task(sender_loop(db, gateway, cfg, stop)),
            asyncio.create_task(grace_loop(db, log_agent_turn, cfg, stop)),
        ]
        logger.info("background loops started")
        yield
        stop.set()
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("background loops stopped")

    app.router.lifespan_context = lifespan
    uvicorn.run(app, host="127.0.0.1", port=cfg.port, log_level="info")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Import smoke check**

Run: `python -c "import concierge.run"`
Expected: no output, exit 0.

- [ ] **Step 3: Full test suite**

Run: `python -m pytest tests/ -v`
Expected: every test from Tasks 2 through 10 passes.

- [ ] **Step 4: Write the README**

`agent/concierge/README.md`:

```markdown
# TLO Concierge Daemon

Messaging spine for The Life Office concierge agent. Receives client WhatsApp/SMS
via Twilio webhooks, stores conversations in the TLO Dashboard Supabase project,
runs the Meg-first grace timer, and sends all outbound messages (Meg's queued
replies now; agent replies arrive in Plan 3).

Spec: `docs/superpowers/specs/2026-07-06-concierge-agent-design.md`

## Run locally

    cd agent/concierge
    python3 -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    export SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
           TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... \
           TWILIO_WHATSAPP_FROM='whatsapp:+44...' TWILIO_SMS_FROM='+1...' \
           PUBLIC_BASE_URL=https://tlo-concierge.sitbacksystems.com
    python -m concierge.run

## Tests

    python -m pytest tests/ -v

## Production

Runs as `tlo-concierge.service` (systemd) on the TPP VPS, port 8090, behind
cloudflared (`tlo-concierge.sitbacksystems.com`). Env lives in
`/etc/tlo-concierge.env` (populated from the VPS secrets manager, never
committed). Heartbeat row: `service_heartbeats.service = 'tlo-concierge'`.

    systemctl status tlo-concierge
    journalctl -u tlo-concierge -n 100 --no-pager
```

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/run.py agent/concierge/README.md
git commit -m "Add concierge daemon entrypoint and README"
```

---

### Task 12: VPS deployment and live smoke test

This task is operational (SSH to the VPS). If the executing agent has no SSH access, produce the exact commands as a handoff checklist for Sam instead, and mark the task blocked rather than done.

**Files:** none in the repo (VPS-side only: systemd unit, env file, cloudflared route).

**Interfaces:**
- Consumes: the complete daemon (Tasks 2-11), the migrated database (Task 1).
- Produces: `tlo-concierge.service` running on the VPS, reachable at `https://tlo-concierge.sitbacksystems.com/health`, with Twilio webhooks pointed at it.

- [ ] **Step 1: Copy the code to the VPS**

From the Mac, repo root:

```bash
rsync -av --exclude '.venv' agent/concierge/ root@46.225.118.135:/root/tlo-concierge/
```

- [ ] **Step 2: Create the venv on the VPS**

```bash
ssh root@46.225.118.135 "cd /root/tlo-concierge && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
```

- [ ] **Step 3: Create the environment file**

On the VPS (values from the secrets manager: `/root/bin/secrets get KEY`; the Supabase values are the TLO Dashboard project's URL and service-role key, NOT the TPP internal project; add TLO-specific Twilio keys to secrets first if the existing `TWILIO_ACCOUNT_SID` belongs to a different account):

```bash
cat > /etc/tlo-concierge.env <<'EOF'
SUPABASE_URL=<TLO Dashboard project URL>
SUPABASE_SERVICE_KEY=<TLO Dashboard service-role key>
TWILIO_ACCOUNT_SID=<from secrets>
TWILIO_AUTH_TOKEN=<from secrets>
TWILIO_WHATSAPP_FROM=whatsapp:<TLO WhatsApp number E.164>
TWILIO_SMS_FROM=<TLO US number E.164>
PUBLIC_BASE_URL=https://tlo-concierge.sitbacksystems.com
PORT=8090
EOF
chmod 600 /etc/tlo-concierge.env
```

- [ ] **Step 4: Create and start the systemd unit**

```bash
cat > /etc/systemd/system/tlo-concierge.service <<'EOF'
[Unit]
Description=TLO Concierge messaging daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/root/tlo-concierge
EnvironmentFile=/etc/tlo-concierge.env
ExecStart=/root/tlo-concierge/.venv/bin/python -m concierge.run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now tlo-concierge
systemctl status tlo-concierge --no-pager
```

Expected: `active (running)`, log line "startup reconciliation recovered 0 message(s)".

- [ ] **Step 5: Add the cloudflared route**

Edit `/etc/cloudflared/config.yml`: add this ingress rule ABOVE the catch-all `http_status:404` rule:

```yaml
  - hostname: tlo-concierge.sitbacksystems.com
    service: http://localhost:8090
```

Then:

```bash
cloudflared tunnel route dns edbab971-d91d-456f-ac18-38c70c87980c tlo-concierge.sitbacksystems.com
systemctl restart cloudflared
curl -s https://tlo-concierge.sitbacksystems.com/health
```

Expected: `{"ok":true}`

- [ ] **Step 6: Point Twilio at the daemon**

In the Twilio console (manual, needs Sam's login):
- WhatsApp sender: set the inbound webhook to `https://tlo-concierge.sitbacksystems.com/twilio/inbound`, method POST.
- The US SMS number: set "A message comes in" to the same URL, method POST.

- [ ] **Step 7: Live smoke test**

1. Insert a test client channel row in Supabase (SQL editor or MCP `execute_sql`), using Sam's own phone number as the address and any existing test client id.
2. WhatsApp the TLO number from that phone: "smoke test".
3. Verify in Supabase: a `messages` row with the text, its conversation in state `awaiting_meg` with a `grace_deadline` about 4 minutes out.
4. Wait 5 minutes. Verify the conversation state is now `agent_active` and `journalctl -u tlo-concierge` shows "agent turn needed for conversation ... (agent not yet implemented)".
5. Insert an outbound reply: a `messages` row with `direction='outbound'`, `author='meg'`, `status='queued'`, `body='smoke test reply'` for that conversation. Verify it arrives on the phone within ~10 seconds and its row flips to `sent`, then `delivered`.
6. Text from an unregistered number. Verify it lands in `quarantined_messages` and no reply is sent.

- [ ] **Step 8: Record completion**

Mark this plan's Task 12 done in the plan file, commit any plan-file checkbox updates:

```bash
git add docs/superpowers/plans/2026-07-06-concierge-spine.md
git commit -m "Deploy concierge spine to VPS and verify live smoke test"
```

---

## What this plan deliberately leaves for Plans 2 and 3

- Plan 2 (dashboard): Conversations UI, Meg reply insertion (server action writing `author='meg', status='queued'` rows and applying `on_meg_send`), takeover/hand-back controls, web push (`push_subscriptions` table + daemon hook), PWA manifest, quarantine claiming, `brief`/`nudge` task types, agents-page concierge card reading `service_heartbeats`, and WhatsApp 24-hour-window handling (auto-apply a pre-approved reopener template when Meg replies outside the session window).
- Plan 3 (agent brain): persona knowledge files, `client_memory` table + panel, real agent turn runner replacing `log_agent_turn`, guardrails, pacing engine, escalations, slot sheets and brief creation, rolling summaries, memory extraction, nudge engine, shadow mode, golden-conversation evals.
