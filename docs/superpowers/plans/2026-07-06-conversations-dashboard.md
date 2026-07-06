# Conversations Dashboard Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Meg's side of the concierge: the Conversations view in the dashboard (list, thread, reply, takeover), thread-per-number rework in the daemon, real web push notifications, quarantine claiming, family/client profile integration, triage chips, and the agents-page concierge card.

**Architecture:** Dashboard work follows the existing Triage page patterns exactly (server components + `lib/*/queries.ts`, URL-param selection, Supabase realtime triggering `router.refresh()`, server actions). Daemon work extends the Plan 1 Python package at `agent/concierge/` with additive-then-switch refactoring so the test suite stays green at every commit. Spec: `docs/superpowers/specs/2026-07-06-conversations-dashboard-design.md`.

**Tech Stack:** Next.js 16.2.2 (App Router), React 19, Tailwind v4, TypeScript, Supabase (`@supabase/ssr`), vitest. Python 3.12, FastAPI, supabase-py, pywebpush, pytest.

## Global Constraints

Every task implicitly includes these. Do not deviate; do not improvise beyond what a task states.

- **Next.js 16 conventions:** `searchParams` is a Promise and must be awaited (see `app/dashboard/(app)/triage/page.tsx:37-42`). Server actions use `"use server"` + `revalidatePath`. Route group `(app)` is not part of the URL.
- **Dashboard style tokens** (match existing pages exactly): shell bg `#EFEBE4`, borders `#E7E2D9` / `#D8D2C8`, muted text `#8A857B` / `#6B665D`, accent sage `#A8B2A1`, urgent red `#C0392B`, headings `font-serif`. Amber for the `awaiting you` chip: `#C77D2B` text on `#F5E9D6` bg.
- **Thread titles are family-first:** "Henderson · Sarah" (client `last_name`, then the person's `first_name`). Use `threadTitle()` from Task 6 everywhere; never hand-format.
- **Python rules (from Plan 1):** Python 3.12, PEP 604 `|` unions only, type hints on every public function, stdlib logging, timestamps only via `concierge.timeutil`, run from `agent/concierge/` with `.venv` activated.
- **Vocabularies:** channels `whatsapp|sms`; states `idle|awaiting_meg|agent_active|meg_active`; message statuses `received|draft|queued|sending|sent|delivered|failed|cancelled`; authors `client|meg|agent`.
- **Push must never block message flow.** Daemon push failures are log-and-skip. Dashboard push failures surface as inline text, never break the page.
- **No em dash characters anywhere** (code, copy, commits). Commit style: short imperative sentence, no emoji.
- **TDD:** failing test first, watch it fail, implement, watch it pass. TS tests run with `npx vitest run <file>` from the repo root; Python with `python -m pytest tests/<file> -v` from `agent/concierge/`.
- The Supabase project is "TLO Dashboard", id `qwuuzcuferetdacqihrg`.

## File Structure

```
Dashboard (Next.js):
  lib/conversations/state.ts + state.test.ts        Task 6: TS state transitions
  lib/conversations/format.ts + format.test.ts      Task 6: titles, countdown, relative time
  lib/conversations/derive.ts + derive.test.ts      Task 7: last-message + unread derivation
  lib/conversations/queries.ts                      Task 7: thread/message/quarantine queries
  app/dashboard/(app)/conversations/page.tsx        Task 8: two-pane view
  app/dashboard/(app)/conversations/actions.ts      Task 8: sendReply, takeOver, handBack
  app/dashboard/(app)/conversations/_components/    Task 8: RealtimeConversations, GraceChip,
                                                            MessageBubble, ReplyBox, ThreadView
  app/dashboard/(app)/conversations/quarantine/     Task 9: page.tsx + actions.ts
  app/dashboard/(app)/clients/_components/HouseholdThreads.tsx  Task 10
  app/dashboard/(app)/clients/actions.ts            Task 10: addChannel
  public/sw.js, app/manifest.ts, icons              Task 11
  app/dashboard/(app)/conversations/_components/PushBanner.tsx  Task 11
  app/dashboard/(app)/conversations/push-actions.ts Task 11
  app/dashboard/(app)/triage/_components/ConversationChips.tsx  Task 12
  lib/agents/concierge.ts + agents page card        Task 12
  app/dashboard/(app)/_components/Sidebar.tsx       Task 8 (add nav entry)

Daemon (Python, agent/concierge/):
  concierge/db.py + tests/fakes.py                  Tasks 2, 4 (new methods)
  concierge/webhook.py, reconcile.py, sender.py     Tasks 3, 5
  concierge/push.py + tests/test_push.py            Task 4
  concierge/config.py, run.py, requirements.txt     Tasks 4, 5
```

---

### Task 1: Database migration and regenerated types

Controller-style task using the Supabase MCP tools (like Plan 1 Task 1).

**Files:**
- Modify: `lib/supabase/types.ts` (regenerated)

**Interfaces:**
- Produces: `client_channels.family_member_id`, `conversations.client_channel_id` (unique, replacing the per-client-channel uniqueness), `tasks.conversation_id`, new `push_subscriptions` table, plus the two RLS policies Plan 1 lacked (insert on conversations, delete on quarantined_messages). Every later task assumes these.

- [ ] **Step 1: Verify the old constraint name**

Call the Supabase MCP `execute_sql` tool, project_id `qwuuzcuferetdacqihrg`:

```sql
select conname from pg_constraint
where conrelid = 'public.conversations'::regclass and contype = 'u';
```

Expected: one row, `conversations_client_id_channel_key`. If it differs, use the actual name in Step 2.

- [ ] **Step 2: Apply the migration**

Call `apply_migration` with name `conversations_dashboard_plan2` and query:

```sql
alter table public.client_channels
  add column family_member_id uuid references public.family_members(id) on delete set null;

alter table public.conversations
  add column client_channel_id uuid references public.client_channels(id) on delete cascade;
alter table public.conversations
  add constraint conversations_client_channel_id_key unique (client_channel_id);
alter table public.conversations
  drop constraint conversations_client_id_channel_key;

alter table public.tasks
  add column conversation_id uuid references public.conversations(id) on delete set null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "authenticated select push_subscriptions" on public.push_subscriptions
  for select to authenticated using (true);
create policy "authenticated insert push_subscriptions" on public.push_subscriptions
  for insert to authenticated with check (true);
create policy "authenticated delete push_subscriptions" on public.push_subscriptions
  for delete to authenticated using (true);

create policy "authenticated insert conversations" on public.conversations
  for insert to authenticated with check (true);
create policy "authenticated delete quarantined" on public.quarantined_messages
  for delete to authenticated using (true);
```

- [ ] **Step 3: Verify** with `list_tables` (expect `push_subscriptions` present).

- [ ] **Step 4: Regenerate types** with `generate_typescript_types`; overwrite `lib/supabase/types.ts` entirely with the output.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit` (repo root). Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "Add Plan 2 schema: channel ownership, per-number threads, push subscriptions"
```

---

### Task 2: Daemon: channel-keyed conversation methods (additive)

**Files:**
- Modify: `agent/concierge/concierge/db.py`
- Modify: `agent/concierge/tests/fakes.py`
- Test: `agent/concierge/tests/test_fakes.py` (append)

**Interfaces:**
- Consumes: existing `ConciergeDB`/`FakeDB` contract from Plan 1.
- Produces (on BOTH classes, identical signatures):
  - `get_or_create_conversation_for_channel(channel_row: dict) -> dict` (keyed on `client_channel_id`, race-safe on the unique constraint)
  - `conversation_address(conversation: dict) -> str | None` (the thread's own number via `client_channel_id`; falls back to `primary_address` for legacy rows with null `client_channel_id`)
  - `conversation_label(conversation: dict) -> str` (person-first display label, format `"Sarah (Henderson)"`; person = channel's family member first name if set, else the client's first name; parenthesised family = client last name; omit parens when last name empty)
- Also produces FakeDB test-setup upgrades (backward compatible): `add_client(client_id, first_name="Client", last_name="")` stores names; new `add_family_member(member_id, client_id, first_name)`; `add_channel(..., family_member_id=None)` now RETURNS the created row dict.
- The old `get_or_create_conversation(client_id, channel)` remains untouched in this task (removed in Task 3).

- [ ] **Step 1: Write the failing tests** (append to `agent/concierge/tests/test_fakes.py`)

```python
def test_get_or_create_conversation_for_channel_is_idempotent_and_links_channel():
    db = FakeDB()
    db.add_client("client-1", first_name="Sarah", last_name="Henderson")
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    a = db.get_or_create_conversation_for_channel(ch)
    b = db.get_or_create_conversation_for_channel(ch)
    assert a["id"] == b["id"]
    assert a["client_channel_id"] == ch["id"]
    assert a["client_id"] == "client-1" and a["channel"] == "whatsapp"


def test_conversation_address_prefers_own_channel_over_primary():
    db = FakeDB()
    db.add_client("client-1", first_name="Sarah", last_name="Henderson")
    db.add_channel("client-1", "whatsapp", "+447700900111", is_primary=True)
    tom = db.add_family_member("fm-1", "client-1", "Tom")
    ch2 = db.add_channel("client-1", "whatsapp", "+447700900222", family_member_id="fm-1")
    conv = db.get_or_create_conversation_for_channel(ch2)
    assert db.conversation_address(conv) == "+447700900222"
    assert tom["first_name"] == "Tom"


def test_conversation_address_falls_back_to_primary_for_legacy_rows():
    db = FakeDB()
    db.add_client("client-1")
    db.add_channel("client-1", "whatsapp", "+447700900111", is_primary=True)
    legacy = db.get_or_create_conversation("client-1", "whatsapp")
    assert legacy.get("client_channel_id") is None
    assert db.conversation_address(legacy) == "+447700900111"


def test_conversation_label_uses_family_member_then_client():
    db = FakeDB()
    db.add_client("client-1", first_name="Sarah", last_name="Henderson")
    db.add_family_member("fm-1", "client-1", "Tom")
    ch_tom = db.add_channel("client-1", "whatsapp", "+447700900222", family_member_id="fm-1")
    ch_sarah = db.add_channel("client-1", "sms", "+447700900111")
    conv_tom = db.get_or_create_conversation_for_channel(ch_tom)
    conv_sarah = db.get_or_create_conversation_for_channel(ch_sarah)
    assert db.conversation_label(conv_tom) == "Tom (Henderson)"
    assert db.conversation_label(conv_sarah) == "Sarah (Henderson)"


def test_conversation_label_without_last_name():
    db = FakeDB()
    db.add_client("client-2", first_name="Priya")
    ch = db.add_channel("client-2", "sms", "+15550001111")
    conv = db.get_or_create_conversation_for_channel(ch)
    assert db.conversation_label(conv) == "Priya"
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m pytest tests/test_fakes.py -v`
Expected: new tests FAIL (`AttributeError`/`TypeError`); all pre-existing tests still PASS.

- [ ] **Step 3: Implement in `tests/fakes.py`**

Replace `add_client` and `add_channel`, and add the new methods to `FakeDB`:

```python
    def add_client(self, client_id: str, first_name: str = "Client", last_name: str = "") -> None:
        self.clients[client_id] = {
            "id": client_id, "first_name": first_name, "last_name": last_name,
        }

    def add_family_member(self, member_id: str, client_id: str, first_name: str) -> dict:
        row = {"id": member_id, "client_id": client_id, "first_name": first_name}
        self.family_members[member_id] = row
        return dict(row)

    def add_channel(self, client_id: str, channel: str, address: str,
                    is_primary: bool = False, family_member_id: str | None = None) -> dict:
        row = {
            "id": _next_id("ch"), "client_id": client_id, "channel": channel,
            "address": address, "is_primary": is_primary,
            "family_member_id": family_member_id,
        }
        self.channels.append(row)
        return dict(row)
```

Add `self.family_members: dict[str, dict] = {}` to `FakeDB.__init__`.

Add the three contract methods to `FakeDB`:

```python
    def get_or_create_conversation_for_channel(self, channel_row: dict) -> dict:
        for conv in self.conversations.values():
            if conv.get("client_channel_id") == channel_row["id"]:
                return dict(conv)
        cid = _next_id("conv")
        conv = {
            "id": cid, "client_id": channel_row["client_id"],
            "channel": channel_row["channel"], "client_channel_id": channel_row["id"],
            "state": "idle", "agent_paused": False, "grace_deadline": None,
            "grace_seconds": 240, "rolling_summary": None, "last_inbound_at": None,
            "created_at": _now_iso(), "updated_at": _now_iso(),
        }
        self.conversations[cid] = conv
        return dict(conv)

    def conversation_address(self, conversation: dict) -> str | None:
        channel_id = conversation.get("client_channel_id")
        if channel_id:
            for ch in self.channels:
                if ch["id"] == channel_id:
                    return ch["address"]
        return self.primary_address(conversation["client_id"], conversation["channel"])

    def conversation_label(self, conversation: dict) -> str:
        person: str | None = None
        channel_id = conversation.get("client_channel_id")
        if channel_id:
            for ch in self.channels:
                if ch["id"] == channel_id and ch.get("family_member_id"):
                    member = self.family_members.get(ch["family_member_id"])
                    if member:
                        person = member["first_name"]
        client = self.clients.get(conversation["client_id"], {})
        first = client.get("first_name", "Client")
        last = client.get("last_name", "")
        person = person or first
        return f"{person} ({last})" if last else person
```

Note: the legacy `get_or_create_conversation` in FakeDB must set `"client_channel_id": None` in the rows it creates (add that key to its conv dict so `conversation_address` fallback works).

- [ ] **Step 4: Run to verify FakeDB passes**

Run: `python -m pytest tests/test_fakes.py -v`
Expected: all PASS.

- [ ] **Step 5: Implement the same three methods on `ConciergeDB` in `concierge/db.py`**

```python
    def get_or_create_conversation_for_channel(self, channel_row: dict) -> dict:
        res = (self._client.table("conversations").select("*")
               .eq("client_channel_id", channel_row["id"]).limit(1).execute())
        if res.data:
            return res.data[0]
        try:
            ins = (self._client.table("conversations").insert({
                "client_id": channel_row["client_id"],
                "channel": channel_row["channel"],
                "client_channel_id": channel_row["id"],
            }).execute())
            return ins.data[0]
        except APIError as exc:
            if exc.code == _UNIQUE_VIOLATION:
                res = (self._client.table("conversations").select("*")
                       .eq("client_channel_id", channel_row["id"]).limit(1).execute())
                return res.data[0]
            raise

    def conversation_address(self, conversation: dict) -> str | None:
        channel_id = conversation.get("client_channel_id")
        if channel_id:
            res = (self._client.table("client_channels").select("address")
                   .eq("id", channel_id).limit(1).execute())
            if res.data:
                return res.data[0]["address"]
        return self.primary_address(conversation["client_id"], conversation["channel"])

    def conversation_label(self, conversation: dict) -> str:
        person: str | None = None
        channel_id = conversation.get("client_channel_id")
        if channel_id:
            ch = (self._client.table("client_channels").select("family_member_id")
                  .eq("id", channel_id).limit(1).execute())
            member_id = ch.data[0]["family_member_id"] if ch.data else None
            if member_id:
                fm = (self._client.table("family_members").select("first_name")
                      .eq("id", member_id).limit(1).execute())
                if fm.data:
                    person = fm.data[0]["first_name"]
        cl = (self._client.table("clients").select("first_name,last_name")
              .eq("id", conversation["client_id"]).limit(1).execute())
        first = cl.data[0]["first_name"] if cl.data else "Client"
        last = (cl.data[0].get("last_name") or "") if cl.data else ""
        person = person or first
        return f"{person} ({last})" if last else person
```

- [ ] **Step 6: Full suite + import check**

Run: `python -m pytest tests/ -v && python -c "import concierge.db"`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add agent/concierge/concierge/db.py agent/concierge/tests/fakes.py agent/concierge/tests/test_fakes.py
git commit -m "Add channel-keyed conversation methods to concierge DB layer"
```

---

### Task 3: Daemon: switch ingest and sending to thread-per-number

**Files:**
- Modify: `agent/concierge/concierge/webhook.py`
- Modify: `agent/concierge/concierge/reconcile.py`
- Modify: `agent/concierge/concierge/sender.py`
- Modify: `agent/concierge/concierge/db.py` and `agent/concierge/tests/fakes.py` (REMOVE `get_or_create_conversation`)
- Test: `agent/concierge/tests/test_webhook.py`, `test_sender.py`, `test_reconcile.py`, `test_grace.py`, `test_fakes.py` (update call sites)

**Interfaces:**
- Consumes: Task 2's `get_or_create_conversation_for_channel`, `conversation_address`.
- Produces: webhook and reconcile resolve inbound to the channel row's own conversation; sender sends to `conversation_address(conv)`. The legacy `get_or_create_conversation(client_id, channel)` no longer exists anywhere.

- [ ] **Step 1: Write the new behavioural test first** (append to `agent/concierge/tests/test_sender.py`)

```python
def test_reply_goes_to_the_threads_own_number_not_primary():
    db = FakeDB()
    db.add_client("client-1", first_name="Sarah", last_name="Henderson")
    db.add_channel("client-1", "whatsapp", "+447700900111", is_primary=True)
    db.add_family_member("fm-1", "client-1", "Tom")
    ch_tom = db.add_channel("client-1", "whatsapp", "+447700900222", family_member_id="fm-1")
    conv = db.get_or_create_conversation_for_channel(ch_tom)
    db.queue_outbound(conv["id"], author="meg", body="Hi Tom")
    gw = FakeGateway()
    process_queued_once(db, gw, CFG, NOW)
    assert gw.sent[0]["to_address"] == "+447700900222"
```

Run: `python -m pytest tests/test_sender.py::test_reply_goes_to_the_threads_own_number_not_primary -v`
Expected: FAIL (sender still uses `primary_address`, so it sends to `+447700900111`).

- [ ] **Step 2: Switch `sender.py`**

In `process_queued_once`, replace the address lookup line:

```python
        address = db.conversation_address(conv)
```

(delete the old `address = db.primary_address(conv["client_id"], conv["channel"])` line; everything else in the function is unchanged).

- [ ] **Step 3: Switch `webhook.py`**

In the `inbound` route, replace:

```python
        conv = db.get_or_create_conversation(channel_row["client_id"], msg.channel)
```

with:

```python
        conv = db.get_or_create_conversation_for_channel(channel_row)
```

- [ ] **Step 4: Switch `reconcile.py`** (same one-line replacement in `reconcile_once`).

- [ ] **Step 5: Remove the legacy method**

Delete `get_or_create_conversation` from BOTH `concierge/db.py` and `tests/fakes.py`.

- [ ] **Step 6: Update every remaining call site in tests**

Search: `grep -rn "get_or_create_conversation(" tests/` and replace each with the channel-row pattern. The affected helpers become:

`tests/test_fakes.py` `make_db()` usage: wherever a test did `conv = db.get_or_create_conversation("client-1", "whatsapp")`, change to:

```python
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation_for_channel(ch)
```

(where `make_db()` already added a channel, capture its return value instead of adding a second one; update `make_db()` to `return db, ch` where needed and adjust callers.)

`tests/test_sender.py` `make_db()`:

```python
def make_db() -> tuple[FakeDB, str]:
    db = FakeDB()
    db.add_client("client-1")
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation_for_channel(ch)
    return db, conv["id"]
```

`tests/test_sender.py::test_missing_address_is_terminal_failure`: a conversation with no address now requires a channel row that is later removed. Rewrite it:

```python
def test_missing_address_is_terminal_failure():
    db = FakeDB()
    db.add_client("client-2")
    ch = db.add_channel("client-2", "sms", "+15550001111")
    conv = db.get_or_create_conversation_for_channel(ch)
    db.channels.clear()  # channel deleted after the message was queued
    mid = db.queue_outbound(conv["id"], author="meg", body="x")
    gw = FakeGateway()
    process_queued_once(db, gw, CFG, NOW)
    assert db.get_message(mid)["status"] == "failed"
    assert gw.sent == []
```

`tests/test_grace.py` `make_db_with_waiting_conversation()`:

```python
def make_db_with_waiting_conversation() -> tuple[FakeDB, str]:
    db = FakeDB()
    db.add_client("client-1")
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation_for_channel(ch)
    db.apply_state(conv["id"], ConvState("awaiting_meg", False, NOW))
    return db, conv["id"]
```

`tests/test_webhook.py`: `known_client_db()` keeps `add_channel` but must capture the row where a conversation is pre-created; in `test_inbound_while_meg_active_does_not_arm_timer` and the two status tests, replace `db.get_or_create_conversation("client-1", "whatsapp")` with the captured-channel pattern. Also append one new webhook test:

```python
def test_inbound_creates_conversation_linked_to_channel():
    client, db, _ = make_client(known_client_db())
    client.post("/twilio/inbound", data=INBOUND_FORM)
    conv = list(db.conversations.values())[0]
    assert conv["client_channel_id"] is not None
```

`tests/test_reconcile.py`: `test_already_stored_message_is_skipped` uses the captured-channel pattern too.

`tests/test_fakes.py::test_conversation_address_falls_back_to_primary_for_legacy_rows` (from Task 2) referenced the legacy method; rewrite it to build the legacy row directly:

```python
def test_conversation_address_falls_back_to_primary_for_legacy_rows():
    db = FakeDB()
    db.add_client("client-1")
    db.add_channel("client-1", "whatsapp", "+447700900111", is_primary=True)
    legacy = {"id": "conv-legacy", "client_id": "client-1", "channel": "whatsapp",
              "client_channel_id": None}
    assert db.conversation_address(legacy) == "+447700900111"
```

- [ ] **Step 7: Full suite**

Run: `python -m pytest tests/ -v`
Expected: all PASS (including the Step 1 test).

- [ ] **Step 8: Commit**

```bash
git add agent/concierge/concierge/ agent/concierge/tests/
git commit -m "Switch concierge threads to one conversation per phone number"
```

---

### Task 4: Daemon: push module

**Files:**
- Create: `agent/concierge/concierge/push.py`
- Modify: `agent/concierge/concierge/config.py` (VAPID fields)
- Modify: `agent/concierge/concierge/db.py` + `tests/fakes.py` (subscription methods, FakePusher)
- Modify: `agent/concierge/requirements.txt` (add `pywebpush>=2,<3`)
- Test: `agent/concierge/tests/test_push.py`

**Interfaces:**
- Consumes: `conversation_label` (Task 2).
- Produces:
  - `Config` gains `vapid_private_key: str = ""` (env `VAPID_PRIVATE_KEY`, optional) and `vapid_subject: str = "mailto:sam@theprocesspartners.com"` (env `VAPID_SUBJECT`, optional).
  - DB methods (both classes): `list_push_subscriptions() -> list[dict]`, `delete_push_subscription(endpoint: str) -> None`. FakeDB extra: `add_push_subscription(endpoint, p256dh="p", auth="a")`.
  - `concierge/push.py`: class `Pusher(db, private_key: str, subject: str)` with `enabled: bool` property (False when key empty), `notify_inbound(conversation: dict, body: str) -> None`, `notify_send_failure(conversation: dict) -> None`. Payload shape `{"title", "body", "url"}`; url is `/dashboard/conversations?conversation=<id>`. Subscriptions returning WebPushException with response status 404/410 are deleted. Nothing ever raises out of Pusher methods.
  - `tests/fakes.py` gains `FakePusher` with `.inbound: list[tuple[dict, str]]`, `.failures: list[dict]`, methods `notify_inbound(conversation, body)` and `notify_send_failure(conversation)` that append. Used by Task 5's wiring tests.

- [ ] **Step 1: Install the dependency**

Append `pywebpush>=2,<3` to `agent/concierge/requirements.txt`, then:

```bash
source .venv/bin/activate && pip install -r requirements.txt
```

- [ ] **Step 2: Write the failing tests** (`agent/concierge/tests/test_push.py`)

```python
from types import SimpleNamespace

import pytest
from pywebpush import WebPushException

import concierge.push as push_module
from concierge.push import Pusher
from tests.fakes import FakeDB


def make_db_with_conv() -> tuple[FakeDB, dict]:
    db = FakeDB()
    db.add_client("client-1", first_name="Sarah", last_name="Henderson")
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation_for_channel(ch)
    return db, conv


def test_disabled_pusher_sends_nothing(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(push_module, "webpush", lambda **kw: calls.append(kw))
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")
    p = Pusher(db, private_key="", subject="mailto:x@y.z")
    assert p.enabled is False
    p.notify_inbound(conv, "hello")
    assert calls == []


def test_notify_inbound_sends_label_preview_and_url(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(push_module, "webpush", lambda **kw: calls.append(kw))
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")
    Pusher(db, "key", "mailto:x@y.z").notify_inbound(conv, "Can you look at flights?")
    assert len(calls) == 1
    import json
    payload = json.loads(calls[0]["data"])
    assert payload["title"] == "Sarah (Henderson)"
    assert payload["body"] == "Can you look at flights?"
    assert payload["url"] == f"/dashboard/conversations?conversation={conv['id']}"


def test_long_bodies_are_truncated(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(push_module, "webpush", lambda **kw: calls.append(kw))
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")
    Pusher(db, "key", "mailto:x@y.z").notify_inbound(conv, "x" * 300)
    import json
    body = json.loads(calls[0]["data"])["body"]
    assert len(body) == 120 and body.endswith("...")


def test_gone_subscription_is_deleted(monkeypatch):
    def gone(**kw):
        raise WebPushException("gone", response=SimpleNamespace(status_code=410))
    monkeypatch.setattr(push_module, "webpush", gone)
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/dead")
    Pusher(db, "key", "mailto:x@y.z").notify_inbound(conv, "hi")
    assert db.push_subscriptions == []


def test_other_push_errors_never_raise(monkeypatch):
    def boom(**kw):
        raise WebPushException("server error", response=SimpleNamespace(status_code=500))
    monkeypatch.setattr(push_module, "webpush", boom)
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")
    Pusher(db, "key", "mailto:x@y.z").notify_send_failure(conv)  # must not raise
    assert len(db.push_subscriptions) == 1
```

Run: `python -m pytest tests/test_push.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'concierge.push'`.

- [ ] **Step 3: Implement**

`concierge/config.py`: add to the dataclass

```python
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:sam@theprocesspartners.com"
```

and to `load_config`:

```python
        vapid_private_key=e.get("VAPID_PRIVATE_KEY", ""),
        vapid_subject=e.get("VAPID_SUBJECT", "mailto:sam@theprocesspartners.com"),
```

`tests/fakes.py`: add to `FakeDB.__init__`: `self.push_subscriptions: list[dict] = []`; add methods:

```python
    def add_push_subscription(self, endpoint: str, p256dh: str = "p", auth: str = "a") -> None:
        self.push_subscriptions.append(
            {"endpoint": endpoint, "p256dh": p256dh, "auth": auth})

    def list_push_subscriptions(self) -> list[dict]:
        return [dict(s) for s in self.push_subscriptions]

    def delete_push_subscription(self, endpoint: str) -> None:
        self.push_subscriptions = [s for s in self.push_subscriptions
                                   if s["endpoint"] != endpoint]
```

and at the end of the file:

```python
class FakePusher:
    def __init__(self) -> None:
        self.inbound: list[tuple[dict, str]] = []
        self.failures: list[dict] = []

    def notify_inbound(self, conversation: dict, body: str) -> None:
        self.inbound.append((dict(conversation), body))

    def notify_send_failure(self, conversation: dict) -> None:
        self.failures.append(dict(conversation))
```

`concierge/db.py`: add

```python
    def list_push_subscriptions(self) -> list[dict]:
        res = self._client.table("push_subscriptions").select("*").execute()
        return res.data or []

    def delete_push_subscription(self, endpoint: str) -> None:
        (self._client.table("push_subscriptions").delete()
         .eq("endpoint", endpoint).execute())
```

`concierge/push.py` (new):

```python
"""Web push to Meg's subscribed devices. Never blocks or raises into callers."""
import json
import logging

from pywebpush import WebPushException, webpush

logger = logging.getLogger(__name__)

_PREVIEW_LIMIT = 120


class Pusher:
    def __init__(self, db, private_key: str, subject: str) -> None:
        self._db = db
        self._key = private_key
        self._subject = subject

    @property
    def enabled(self) -> bool:
        return bool(self._key)

    def _send_all(self, payload: dict) -> int:
        if not self.enabled:
            return 0
        sent = 0
        body = json.dumps(payload)
        for sub in self._db.list_push_subscriptions():
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                    },
                    data=body,
                    vapid_private_key=self._key,
                    vapid_claims={"sub": self._subject},
                )
                sent += 1
            except WebPushException as exc:
                status = getattr(getattr(exc, "response", None), "status_code", None)
                if status in (404, 410):
                    self._db.delete_push_subscription(sub["endpoint"])
                    logger.info("removed dead push subscription")
                else:
                    logger.warning("push delivery failed: %s", exc)
            except Exception:
                logger.exception("unexpected push failure")
        return sent

    def notify_inbound(self, conversation: dict, body: str) -> None:
        preview = body if len(body) <= _PREVIEW_LIMIT else body[:_PREVIEW_LIMIT - 3] + "..."
        self._send_all({
            "title": self._db.conversation_label(conversation),
            "body": preview,
            "url": f"/dashboard/conversations?conversation={conversation['id']}",
        })

    def notify_send_failure(self, conversation: dict) -> None:
        label = self._db.conversation_label(conversation)
        self._send_all({
            "title": "Delivery problem",
            "body": f"A message to {label} couldn't be delivered",
            "url": f"/dashboard/conversations?conversation={conversation['id']}",
        })
```

- [ ] **Step 4: Run to verify**

Run: `python -m pytest tests/test_push.py tests/test_fakes.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/concierge/concierge/push.py agent/concierge/concierge/config.py \
  agent/concierge/concierge/db.py agent/concierge/tests/fakes.py \
  agent/concierge/tests/test_push.py agent/concierge/requirements.txt
git commit -m "Add web push module with VAPID config and dead-subscription pruning"
```

---

### Task 5: Daemon: wire push triggers

**Files:**
- Modify: `agent/concierge/concierge/webhook.py` (`create_app(db, gateway, cfg, pusher=None)`)
- Modify: `agent/concierge/concierge/reconcile.py` (`reconcile_once(db, gateway, cfg, now, pusher=None)`)
- Modify: `agent/concierge/concierge/sender.py` (`process_queued_once(db, gateway, cfg, now, pusher=None)`, `sender_loop(..., pusher=None)`)
- Modify: `agent/concierge/concierge/run.py` (construct `Pusher`, pass everywhere)
- Test: append to `test_webhook.py`, `test_reconcile.py`, `test_sender.py`

**Interfaces:**
- Consumes: `Pusher` contract / `FakePusher` (Task 4).
- Produces: push fires on (1) webhook inbound stored, (2) reconcile-recovered inbound at most once per conversation per run, (3) terminal send failure, (4) status-callback failure. NO push on grace expiry. `pusher=None` disables all push (keeps old tests valid without edits).

- [ ] **Step 1: Failing tests**

Append to `tests/test_webhook.py` (note `make_client` gains an optional pusher: change its signature to `def make_client(db=None, gateway=None, pusher=None)` and pass through to `create_app(db, gateway, CFG, pusher)`):

```python
def test_inbound_triggers_push():
    from tests.fakes import FakePusher
    pusher = FakePusher()
    client, db, _ = make_client(known_client_db(), pusher=pusher)
    client.post("/twilio/inbound", data=INBOUND_FORM)
    assert len(pusher.inbound) == 1
    conv, body = pusher.inbound[0]
    assert body == "Hi Meg"


def test_duplicate_inbound_does_not_push_twice():
    from tests.fakes import FakePusher
    pusher = FakePusher()
    client, db, _ = make_client(known_client_db(), pusher=pusher)
    client.post("/twilio/inbound", data=INBOUND_FORM)
    client.post("/twilio/inbound", data=INBOUND_FORM)
    assert len(pusher.inbound) == 1


def test_status_failure_triggers_failure_push():
    from datetime import datetime, timezone
    from tests.fakes import FakePusher
    pusher = FakePusher()
    db = known_client_db()
    ch = db.channels[0]
    conv = db.get_or_create_conversation_for_channel(ch)
    mid = db.queue_outbound(conv["id"], author="agent", body="x")
    db.mark_sent(mid, "SM101", datetime.now(timezone.utc))
    client, db, _ = make_client(db, pusher=pusher)
    client.post("/twilio/status", data={"MessageSid": "SM101", "MessageStatus": "failed"})
    assert len(pusher.failures) == 1
```

Append to `tests/test_reconcile.py`:

```python
def test_reconcile_pushes_at_most_once_per_conversation():
    from tests.fakes import FakePusher
    db = make_db()
    gw = FakeGateway()
    gw.inbound_history = [
        InboundMessage("whatsapp", "+447700900123", "first", "SM910"),
        InboundMessage("whatsapp", "+447700900123", "second", "SM911"),
    ]
    pusher = FakePusher()
    assert reconcile_once(db, gw, CFG, NOW, pusher=pusher) == 2
    assert len(pusher.inbound) == 1
```

Append to `tests/test_sender.py`:

```python
def test_terminal_failure_triggers_failure_push():
    from tests.fakes import FakePusher
    db, conv_id = make_db()
    mid = db.queue_outbound(conv_id, author="meg", body="x")
    gw = FakeGateway()
    pusher = FakePusher()
    cfg_one = Config(
        supabase_url="u", supabase_service_key="k", twilio_account_sid="AC",
        twilio_auth_token="t", twilio_whatsapp_from="whatsapp:+440",
        twilio_sms_from="+10", public_base_url="https://cb.example.com",
        max_send_attempts=1,
    )
    gw.fail_next = 1
    process_queued_once(db, gw, cfg_one, NOW, pusher=pusher)
    assert db.get_message(mid)["status"] == "failed"
    assert len(pusher.failures) == 1
```

Run: `python -m pytest tests/test_webhook.py tests/test_reconcile.py tests/test_sender.py -v`
Expected: new tests FAIL (`TypeError: unexpected keyword argument 'pusher'` or missing behaviour).

- [ ] **Step 2: Implement the wiring**

`webhook.py`: signature `def create_app(db, gateway, cfg: Config, pusher=None) -> FastAPI:`. In `inbound`, immediately after `db.apply_state(...)`:

```python
        if pusher is not None:
            pusher.notify_inbound(db.get_conversation(conv["id"]) or conv, msg.body)
```

In `status`, inside the failure branch after `db.flag_conversation_for_meg(...)`:

```python
                if pusher is not None:
                    failed_conv = db.get_conversation(row["conversation_id"])
                    if failed_conv is not None:
                        pusher.notify_send_failure(failed_conv)
```

`reconcile.py`: signature `def reconcile_once(db, gateway, cfg: Config, now: datetime, pusher=None) -> int:`. Add `pushed: set[str] = set()` before the loop; after the `apply_state` call for a recovered message:

```python
        if pusher is not None and conv["id"] not in pushed:
            pushed.add(conv["id"])
            pusher.notify_inbound(db.get_conversation(conv["id"]) or conv, msg.body)
```

`sender.py`: `def process_queued_once(db, gateway, cfg: Config, now: datetime, pusher=None) -> int:`; in BOTH terminal-failure paths (missing address, and `if terminal:` after a send exception), after `db.flag_conversation_for_meg(conv["id"])`:

```python
            if pusher is not None:
                pusher.notify_send_failure(conv)
```

`sender_loop` gains `pusher=None` and passes it through. `grace_loop` is untouched (no push on expiry, by spec).

`run.py`: after constructing `gateway`:

```python
    from concierge.push import Pusher
    pusher = Pusher(db, cfg.vapid_private_key, cfg.vapid_subject)
```

(put the import at the top with the others, not inline), pass `pusher` to `reconcile_once(...)`, `create_app(db, gateway, cfg, pusher)`, and `sender_loop(db, gateway, cfg, stop, pusher)`.

- [ ] **Step 3: Full suite**

Run: `python -m pytest tests/ -v && python -c "import concierge.run"`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add agent/concierge/concierge/ agent/concierge/tests/
git commit -m "Wire push notifications into inbound, reconcile, and failure paths"
```

---

### Task 6: Dashboard: state transitions and formatting helpers

**Files:**
- Create: `lib/conversations/state.ts`, Test: `lib/conversations/state.test.ts`
- Create: `lib/conversations/format.ts`, Test: `lib/conversations/format.test.ts`

**Interfaces:**
- Produces (Tasks 8-10 consume):

```ts
// state.ts
export type ConversationState = "idle" | "awaiting_meg" | "agent_active" | "meg_active";
export type ConvState = { state: ConversationState; agent_paused: boolean; grace_deadline: string | null };
export function onMegSend(): ConvState;
export function onHandBack(): ConvState;
export function takeOver(): ConvState;   // same result as onMegSend
export function onInbound(current: ConvState, nowIso: string, graceSeconds: number): ConvState;

// format.ts
export function threadTitle(client: { first_name: string; last_name: string | null }, person: { first_name: string } | null): string; // "Henderson · Sarah"
export function relativeTime(iso: string, now?: Date): string;      // "2m", "3h", "4d"
export function graceCountdown(deadlineIso: string | null, now?: Date): string | null; // "3m 12s", "45s", "now", null
```

- [ ] **Step 1: Failing tests**

`lib/conversations/state.test.ts` (mirrors `agent/concierge/tests/test_state.py` case-for-case for the transitions the dashboard owns):

```ts
import { describe, expect, it } from "vitest";

import { onHandBack, onInbound, onMegSend, takeOver, type ConvState } from "./state";

const NOW = "2026-07-06T12:00:00.000Z";
const IDLE: ConvState = { state: "idle", agent_paused: false, grace_deadline: null };

describe("onMegSend", () => {
  it("silences the agent and kills the timer", () => {
    expect(onMegSend()).toEqual({ state: "meg_active", agent_paused: true, grace_deadline: null });
  });
});

describe("takeOver", () => {
  it("matches onMegSend", () => {
    expect(takeOver()).toEqual(onMegSend());
  });
});

describe("onHandBack", () => {
  it("resets to idle and unpauses", () => {
    expect(onHandBack()).toEqual({ state: "idle", agent_paused: false, grace_deadline: null });
  });
});

describe("onInbound", () => {
  it("arms the grace timer from now", () => {
    const next = onInbound(IDLE, NOW, 240);
    expect(next.state).toBe("awaiting_meg");
    expect(next.agent_paused).toBe(false);
    expect(next.grace_deadline).toBe("2026-07-06T12:04:00.000Z");
  });

  it("does not arm the timer when Meg has taken over", () => {
    const current: ConvState = { state: "meg_active", agent_paused: true, grace_deadline: null };
    expect(onInbound(current, NOW, 240)).toEqual({
      state: "meg_active", agent_paused: true, grace_deadline: null,
    });
  });
});
```

`lib/conversations/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { graceCountdown, relativeTime, threadTitle } from "./format";

describe("threadTitle", () => {
  it("is family-first with the family member's name", () => {
    expect(threadTitle({ first_name: "Sarah", last_name: "Henderson" }, { first_name: "Tom" }))
      .toBe("Henderson · Tom");
  });
  it("uses the client themself when no family member is linked", () => {
    expect(threadTitle({ first_name: "Sarah", last_name: "Henderson" }, null))
      .toBe("Henderson · Sarah");
  });
  it("degrades gracefully without a last name", () => {
    expect(threadTitle({ first_name: "Priya", last_name: null }, null)).toBe("Priya");
  });
});

describe("graceCountdown", () => {
  const now = new Date("2026-07-06T12:00:00.000Z");
  it("renders minutes and seconds", () => {
    expect(graceCountdown("2026-07-06T12:03:12.000Z", now)).toBe("3m 12s");
  });
  it("renders seconds only under a minute", () => {
    expect(graceCountdown("2026-07-06T12:00:45.000Z", now)).toBe("45s");
  });
  it("clamps past deadlines to now", () => {
    expect(graceCountdown("2026-07-06T11:59:00.000Z", now)).toBe("now");
  });
  it("returns null without a deadline", () => {
    expect(graceCountdown(null, now)).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-07-06T12:00:00.000Z");
  it("minutes", () => expect(relativeTime("2026-07-06T11:58:00.000Z", now)).toBe("2m"));
  it("hours", () => expect(relativeTime("2026-07-06T09:00:00.000Z", now)).toBe("3h"));
  it("days", () => expect(relativeTime("2026-07-02T12:00:00.000Z", now)).toBe("4d"));
  it("now for under a minute", () => expect(relativeTime("2026-07-06T11:59:40.000Z", now)).toBe("now"));
});
```

Run: `npx vitest run lib/conversations/`
Expected: FAIL (modules not found).

- [ ] **Step 2: Implement**

`lib/conversations/state.ts`:

```ts
// Mirrors agent/concierge/concierge/state.py. If you change one, change both.
export type ConversationState = "idle" | "awaiting_meg" | "agent_active" | "meg_active";

export type ConvState = {
  state: ConversationState;
  agent_paused: boolean;
  grace_deadline: string | null;
};

export function onMegSend(): ConvState {
  return { state: "meg_active", agent_paused: true, grace_deadline: null };
}

export function takeOver(): ConvState {
  return onMegSend();
}

export function onHandBack(): ConvState {
  return { state: "idle", agent_paused: false, grace_deadline: null };
}

export function onInbound(current: ConvState, nowIso: string, graceSeconds: number): ConvState {
  if (current.agent_paused) {
    return { state: "meg_active", agent_paused: true, grace_deadline: null };
  }
  const deadline = new Date(new Date(nowIso).getTime() + graceSeconds * 1000).toISOString();
  return { state: "awaiting_meg", agent_paused: false, grace_deadline: deadline };
}
```

`lib/conversations/format.ts`:

```ts
export function threadTitle(
  client: { first_name: string; last_name: string | null },
  person: { first_name: string } | null,
): string {
  const first = person?.first_name ?? client.first_name;
  const family = client.last_name ?? "";
  return family ? `${family} · ${first}` : first;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function graceCountdown(deadlineIso: string | null, now: Date = new Date()): string | null {
  if (!deadlineIso) return null;
  const ms = new Date(deadlineIso).getTime() - now.getTime();
  if (ms <= 0) return "now";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
```

- [ ] **Step 3: Run to verify**

Run: `npx vitest run lib/conversations/`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/conversations/state.ts lib/conversations/state.test.ts \
  lib/conversations/format.ts lib/conversations/format.test.ts
git commit -m "Add conversation state transitions and formatting helpers for the dashboard"
```

---

### Task 7: Dashboard: derivation helpers and queries

**Files:**
- Create: `lib/conversations/derive.ts`, Test: `lib/conversations/derive.test.ts`
- Create: `lib/conversations/queries.ts`

**Interfaces:**
- Consumes: `threadTitle` (Task 6), Supabase server client (`@/lib/supabase/server`), generated types.
- Produces:

```ts
// derive.ts (pure, tested)
export type LiteMessage = { conversation_id: string; direction: string; author: string;
  body: string; created_at: string; status: string };
export function lastMessageByConversation(messagesDesc: LiteMessage[]): Map<string, LiteMessage>;
export function isUnread(messagesDesc: LiteMessage[], conversationId: string): boolean;

// queries.ts (thin, no unit tests; verified via the page)
export type ThreadListItem = {
  conversation: ConversationRow;            // full row
  title: string;                            // via threadTitle
  channel: "whatsapp" | "sms" | string;
  address: string | null;
  lastMessage: LiteMessage | null;
  unread: boolean;
};
export async function getThreads(): Promise<ThreadListItem[]>;   // unread first, then updated_at desc
export async function getThread(id: string): Promise<{ conversation: ConversationRow & joins; messages: MessageRow[] } | null>;
export async function getQuarantined(): Promise<QuarantinedRow[]>;
```

- [ ] **Step 1: Failing tests** (`lib/conversations/derive.test.ts`)

```ts
import { describe, expect, it } from "vitest";

import { isUnread, lastMessageByConversation, type LiteMessage } from "./derive";

function msg(overrides: Partial<LiteMessage>): LiteMessage {
  return {
    conversation_id: "c1", direction: "inbound", author: "client",
    body: "hi", created_at: "2026-07-06T12:00:00.000Z", status: "received",
    ...overrides,
  };
}

describe("lastMessageByConversation", () => {
  it("takes the first (newest) message per conversation from a desc list", () => {
    const messages = [
      msg({ conversation_id: "c1", body: "newest", created_at: "2026-07-06T12:05:00.000Z" }),
      msg({ conversation_id: "c2", body: "other" }),
      msg({ conversation_id: "c1", body: "older", created_at: "2026-07-06T11:00:00.000Z" }),
    ];
    const map = lastMessageByConversation(messages);
    expect(map.get("c1")?.body).toBe("newest");
    expect(map.get("c2")?.body).toBe("other");
  });
});

describe("isUnread", () => {
  it("is unread when the latest inbound is newer than Meg's latest message", () => {
    const messages = [
      msg({ created_at: "2026-07-06T12:05:00.000Z" }),
      msg({ direction: "outbound", author: "meg", created_at: "2026-07-06T12:00:00.000Z" }),
    ];
    expect(isUnread(messages, "c1")).toBe(true);
  });
  it("is read once Meg has replied after the last inbound", () => {
    const messages = [
      msg({ direction: "outbound", author: "meg", created_at: "2026-07-06T12:10:00.000Z" }),
      msg({ created_at: "2026-07-06T12:05:00.000Z" }),
    ];
    expect(isUnread(messages, "c1")).toBe(false);
  });
  it("agent replies do not mark a thread read", () => {
    const messages = [
      msg({ direction: "outbound", author: "agent", created_at: "2026-07-06T12:10:00.000Z" }),
      msg({ created_at: "2026-07-06T12:05:00.000Z" }),
    ];
    expect(isUnread(messages, "c1")).toBe(true);
  });
  it("no inbound means not unread", () => {
    const messages = [msg({ direction: "outbound", author: "meg" })];
    expect(isUnread(messages, "c1")).toBe(false);
  });
});
```

Run: `npx vitest run lib/conversations/derive.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `lib/conversations/derive.ts`**

```ts
export type LiteMessage = {
  conversation_id: string;
  direction: string;
  author: string;
  body: string;
  created_at: string;
  status: string;
};

// messagesDesc must be sorted newest-first.
export function lastMessageByConversation(messagesDesc: LiteMessage[]): Map<string, LiteMessage> {
  const map = new Map<string, LiteMessage>();
  for (const m of messagesDesc) {
    if (!map.has(m.conversation_id)) map.set(m.conversation_id, m);
  }
  return map;
}

export function isUnread(messagesDesc: LiteMessage[], conversationId: string): boolean {
  let latestInbound: string | null = null;
  let latestMeg: string | null = null;
  for (const m of messagesDesc) {
    if (m.conversation_id !== conversationId) continue;
    if (m.direction === "inbound" && latestInbound === null) latestInbound = m.created_at;
    if (m.author === "meg" && latestMeg === null) latestMeg = m.created_at;
    if (latestInbound !== null && latestMeg !== null) break;
  }
  if (latestInbound === null) return false;
  return latestMeg === null || latestInbound > latestMeg;
}
```

- [ ] **Step 3: Run to verify** (`npx vitest run lib/conversations/derive.test.ts`, all PASS)

- [ ] **Step 4: Implement `lib/conversations/queries.ts`** (no unit test; typechecked)

```ts
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

import { threadTitle } from "./format";
import { isUnread, lastMessageByConversation, type LiteMessage } from "./derive";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type QuarantinedRow = Database["public"]["Tables"]["quarantined_messages"]["Row"];

type ConversationJoined = ConversationRow & {
  client: { first_name: string; last_name: string | null } | null;
  channel_row:
    | { id: string; address: string; channel: string;
        family_member: { first_name: string } | null }
    | null;
};

export type ThreadListItem = {
  conversation: ConversationJoined;
  title: string;
  channel: string;
  address: string | null;
  lastMessage: LiteMessage | null;
  unread: boolean;
};

const CONVERSATION_SELECT =
  "*, client:clients(first_name,last_name), channel_row:client_channels(id,address,channel,family_member:family_members(first_name))";

export async function getThreads(): Promise<ThreadListItem[]> {
  const supabase = await createClient();
  const [{ data: convs, error: convError }, { data: msgs, error: msgError }] =
    await Promise.all([
      supabase.from("conversations").select(CONVERSATION_SELECT)
        .order("updated_at", { ascending: false }),
      supabase.from("messages")
        .select("conversation_id,direction,author,body,created_at,status")
        .order("created_at", { ascending: false }).limit(500),
    ]);
  if (convError) throw new Error(`Failed to load conversations: ${convError.message}`);
  if (msgError) throw new Error(`Failed to load messages: ${msgError.message}`);

  const messages = (msgs ?? []) as LiteMessage[];
  const lastByConv = lastMessageByConversation(messages);

  const items = ((convs ?? []) as ConversationJoined[]).map((conversation) => ({
    conversation,
    title: conversation.client
      ? threadTitle(conversation.client, conversation.channel_row?.family_member ?? null)
      : "Unknown",
    channel: conversation.channel,
    address: conversation.channel_row?.address ?? null,
    lastMessage: lastByConv.get(conversation.id) ?? null,
    unread: isUnread(messages, conversation.id),
  }));

  items.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    const aT = a.lastMessage?.created_at ?? a.conversation.updated_at;
    const bT = b.lastMessage?.created_at ?? b.conversation.updated_at;
    return aT < bT ? 1 : -1;
  });
  return items;
}

export async function getThread(id: string): Promise<
  { conversation: ConversationJoined; messages: MessageRow[] } | null
> {
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("conversations").select(CONVERSATION_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load conversation: ${error.message}`);
  if (!conversation) return null;
  const { data: messages, error: msgError } = await supabase
    .from("messages").select("*").eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (msgError) throw new Error(`Failed to load messages: ${msgError.message}`);
  return { conversation: conversation as ConversationJoined, messages: messages ?? [] };
}

export async function getQuarantined(): Promise<QuarantinedRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quarantined_messages").select("*")
    .order("received_at", { ascending: false });
  if (error) throw new Error(`Failed to load quarantine: ${error.message}`);
  return data ?? [];
}
```

- [ ] **Step 5: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run lib/conversations/`
Expected: exit 0, all PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/conversations/derive.ts lib/conversations/derive.test.ts lib/conversations/queries.ts
git commit -m "Add conversation queries with unread and last-message derivation"
```

---

### Task 8: Dashboard: the Conversations page

**Files:**
- Create: `app/dashboard/(app)/conversations/page.tsx`
- Create: `app/dashboard/(app)/conversations/actions.ts`
- Create: `app/dashboard/(app)/conversations/_components/RealtimeConversations.tsx`
- Create: `app/dashboard/(app)/conversations/_components/GraceChip.tsx`
- Create: `app/dashboard/(app)/conversations/_components/ThreadView.tsx`
- Modify: `app/dashboard/(app)/_components/Sidebar.tsx` (add nav entry)

**Interfaces:**
- Consumes: `getThreads`, `getThread` (Task 7); `onMegSend`, `takeOver`, `onHandBack` (Task 6); `relativeTime`, `graceCountdown` (Task 6).
- Produces: `/dashboard/conversations?conversation=<id>&view=summary|transcript` route; server actions `sendReply`, `takeOverConversation`, `handBackConversation` (Tasks 9-10 reuse the actions file's patterns but not these functions).

- [ ] **Step 1: Sidebar entry**

In `app/dashboard/(app)/_components/Sidebar.tsx`, add to the `NAV` array directly after the Triage entry:

```ts
  { href: "/dashboard/conversations", label: "Conversations" },
```

- [ ] **Step 2: Server actions** (`app/dashboard/(app)/conversations/actions.ts`)

```ts
"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { onHandBack, onMegSend, takeOver } from "@/lib/conversations/state";

async function applyTransition(conversationId: string, next: ReturnType<typeof onMegSend>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw new Error(`Failed to update conversation: ${error.message}`);
  revalidatePath("/dashboard/conversations");
}

export async function sendReply(formData: FormData) {
  const conversationId = String(formData.get("conversationId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    author: "meg",
    body,
    status: "queued",
  });
  if (error) throw new Error(`Failed to queue reply: ${error.message}`);
  await applyTransition(conversationId, onMegSend());
}

export async function takeOverConversation(formData: FormData) {
  await applyTransition(String(formData.get("conversationId")), takeOver());
}

export async function handBackConversation(formData: FormData) {
  await applyTransition(String(formData.get("conversationId")), onHandBack());
}
```

- [ ] **Step 3: Realtime component** (`_components/RealtimeConversations.tsx`)

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Re-fetches the server-rendered view whenever conversations or messages change.
export function RealtimeConversations() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("conversations-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" },
        () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" },
        () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
```

- [ ] **Step 4: Grace countdown chip** (`_components/GraceChip.tsx`)

```tsx
"use client";

import { useEffect, useState } from "react";

import { graceCountdown } from "@/lib/conversations/format";

// Live countdown to the grace deadline; renders nothing when there is no deadline.
export function GraceChip({ deadline }: { deadline: string | null }) {
  const [label, setLabel] = useState<string | null>(() => graceCountdown(deadline));

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLabel(graceCountdown(deadline));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!label) return null;
  return (
    <span className="rounded-full bg-[#F5E9D6] px-2 py-0.5 text-[11px] font-medium text-[#C77D2B]">
      awaiting you · {label}
    </span>
  );
}
```

- [ ] **Step 5: Thread view** (`_components/ThreadView.tsx`)

```tsx
import Link from "next/link";

import type { Database } from "@/lib/supabase/types";

import { handBackConversation, sendReply, takeOverConversation } from "../actions";
import { GraceChip } from "./GraceChip";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

const STATUS_LABEL: Record<string, string> = {
  queued: "queued", sending: "sending", sent: "sent",
  delivered: "delivered", failed: "failed", cancelled: "cancelled",
};

function Bubble({ message }: { message: MessageRow }) {
  const inbound = message.direction === "inbound";
  const fromAgent = message.author === "agent";
  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
          inbound
            ? "bg-white border border-[#E7E2D9]"
            : fromAgent
              ? "bg-[#DFE5DA] border border-[#C9D2C2]"
              : "bg-[#A8B2A1] text-white"
        }`}
      >
        {fromAgent ? (
          <div className="mb-0.5 text-[10px] uppercase tracking-wide text-[#5F6B58]">
            assistant · sent as Meg
          </div>
        ) : null}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <div className={`mt-1 text-[10px] ${inbound ? "text-[#A39E94]" : fromAgent ? "text-[#5F6B58]" : "text-white/70"}`}>
          {new Date(message.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          {!inbound && STATUS_LABEL[message.status] ? ` · ${STATUS_LABEL[message.status]}` : ""}
        </div>
      </div>
    </div>
  );
}

export function ThreadView({
  conversation, messages, title, view,
}: {
  conversation: { id: string; state: string; agent_paused: boolean;
    grace_deadline: string | null; rolling_summary: string | null };
  messages: MessageRow[];
  title: string;
  view: "transcript" | "summary";
}) {
  const paused = conversation.agent_paused;
  return (
    <div className="flex h-full flex-col rounded-xl border border-[#E4DFD6] bg-[#FAF8F4]">
      <div className="flex items-center justify-between gap-3 border-b border-[#E7E2D9] px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-lg">{title}</h2>
          <GraceChip deadline={conversation.state === "awaiting_meg" ? conversation.grace_deadline : null} />
          {conversation.state === "agent_active" ? (
            <span className="rounded-full bg-[#DFE5DA] px-2 py-0.5 text-[11px] font-medium text-[#5F6B58]">
              agent active
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/conversations?conversation=${conversation.id}&view=${view === "summary" ? "transcript" : "summary"}`}
            className="text-xs text-[#6B665D] underline hover:text-[#1F1F1F]"
          >
            {view === "summary" ? "Show transcript" : "Show summary"}
          </Link>
          <form action={paused ? handBackConversation : takeOverConversation}>
            <input type="hidden" name="conversationId" value={conversation.id} />
            <button
              type="submit"
              className="rounded-md border border-[#D8D2C8] bg-white px-3 py-1.5 text-xs hover:bg-[#EFEBE4]"
            >
              {paused ? "Hand back to assistant" : "I've got this"}
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {view === "summary" ? (
          <p className="text-sm text-[#6B665D]">
            {conversation.rolling_summary ?? "No summary yet."}
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#8A857B]">No messages yet.</p>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
      </div>

      <form action={sendReply} className="flex gap-2 border-t border-[#E7E2D9] px-4 py-3">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <textarea
          name="body"
          rows={2}
          required
          placeholder="Reply as Meg..."
          className="flex-1 resize-none rounded-lg border border-[#D8D2C8] bg-white px-3 py-2 text-sm outline-none focus:border-[#A8B2A1]"
        />
        <button
          type="submit"
          className="self-end rounded-lg bg-[#A8B2A1] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: The page** (`app/dashboard/(app)/conversations/page.tsx`)

```tsx
import Link from "next/link";

import { relativeTime } from "@/lib/conversations/format";
import { getThread, getThreads } from "@/lib/conversations/queries";
import { createClient } from "@/lib/supabase/server";

import { RealtimeConversations } from "./_components/RealtimeConversations";
import { ThreadView } from "./_components/ThreadView";

function StateChip({ state }: { state: string }) {
  if (state === "awaiting_meg")
    return <span className="rounded-full bg-[#F5E9D6] px-2 py-0.5 text-[10px] font-medium text-[#C77D2B]">awaiting you</span>;
  if (state === "agent_active")
    return <span className="rounded-full bg-[#DFE5DA] px-2 py-0.5 text-[10px] font-medium text-[#5F6B58]">agent active</span>;
  return null;
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; view?: string }>;
}) {
  const { conversation: selectedId, view } = await searchParams;
  const threads = await getThreads();
  const activeId = selectedId ?? threads[0]?.conversation.id ?? null;
  const thread = activeId ? await getThread(activeId) : null;

  const supabase = await createClient();
  const { count: quarantineCount } = await supabase
    .from("quarantined_messages")
    .select("*", { count: "exact", head: true });

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <RealtimeConversations />
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl mb-1">Conversations</h1>
          <p className="text-sm text-[#8A857B]">
            {threads.length} {threads.length === 1 ? "thread" : "threads"}
          </p>
        </div>
        {quarantineCount ? (
          <Link
            href="/dashboard/conversations/quarantine"
            className="text-sm text-[#C0392B] underline"
          >
            {quarantineCount} unknown {quarantineCount === 1 ? "number" : "numbers"}
          </Link>
        ) : null}
      </div>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-[#E4DFD6] bg-white px-6 py-12 text-center text-sm text-[#8A857B]">
          No conversations yet.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Mobile: full-screen list until a thread is explicitly selected; thread replaces it. */}
          <ul className={`w-full space-y-2 overflow-y-auto md:w-72 md:shrink-0 ${selectedId ? "hidden md:block" : ""}`}>
            {threads.map((t) => {
              const active = t.conversation.id === activeId;
              return (
                <li key={t.conversation.id}>
                  <Link
                    href={`/dashboard/conversations?conversation=${t.conversation.id}`}
                    className={`block rounded-lg border px-3 py-2.5 transition-colors ${
                      active ? "border-[#A8B2A1] bg-white" : "border-[#E7E2D9] bg-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${t.unread ? "font-semibold" : "font-medium"}`}>
                        {t.title}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase text-[#A39E94]">{t.channel}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-[#8A857B]">
                        {t.lastMessage?.body ?? "No messages"}
                      </span>
                      <span className="shrink-0 text-[10px] text-[#A39E94]">
                        {t.lastMessage ? relativeTime(t.lastMessage.created_at) : ""}
                      </span>
                    </div>
                    <div className="mt-1">
                      <StateChip state={t.conversation.state} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className={`min-w-0 flex-1 ${selectedId ? "" : "hidden md:block"}`}>
            {selectedId ? (
              <Link href="/dashboard/conversations" className="mb-2 inline-block text-xs text-[#6B665D] underline md:hidden">
                Back to all conversations
              </Link>
            ) : null}
            {thread ? (
              <ThreadView
                conversation={thread.conversation}
                messages={thread.messages}
                title={
                  threads.find((t) => t.conversation.id === thread.conversation.id)?.title ?? "Conversation"
                }
                view={view === "summary" ? "summary" : "transcript"}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0, all tests PASS.

Then run the app and check visually with the preview tooling: start the dev server, insert a test conversation + message via Supabase MCP `execute_sql` (a client, a channel, a conversation linked to it, one inbound message), and confirm: thread appears titled "Henderson · Sarah" style, chip shows, selecting it renders the transcript, submitting the reply box inserts a `queued` message row and flips the conversation to `meg_active`.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/\(app\)/conversations app/dashboard/\(app\)/_components/Sidebar.tsx
git commit -m "Add the Conversations view with reply, takeover, and live refresh"
```

---

### Task 9: Dashboard: quarantine claiming

**Files:**
- Create: `app/dashboard/(app)/conversations/quarantine/page.tsx`
- Create: `app/dashboard/(app)/conversations/quarantine/actions.ts`

**Interfaces:**
- Consumes: `getQuarantined` (Task 7), `onInbound` (Task 6).
- Produces: claim flow that registers the number, creates/finds its conversation, re-homes the message, arms the grace state, deletes the quarantine row.

- [ ] **Step 1: Actions** (`quarantine/actions.ts`)

```ts
"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { onInbound, type ConvState } from "@/lib/conversations/state";

export async function claimQuarantined(formData: FormData) {
  const quarantineId = String(formData.get("quarantineId"));
  const clientId = String(formData.get("clientId"));
  const familyMemberId = String(formData.get("familyMemberId") ?? "");
  const supabase = await createClient();

  const { data: q, error: qError } = await supabase
    .from("quarantined_messages").select("*").eq("id", quarantineId).single();
  if (qError) throw new Error(`Quarantined message not found: ${qError.message}`);

  const { data: channel, error: chError } = await supabase
    .from("client_channels")
    .insert({
      client_id: clientId,
      channel: q.channel,
      address: q.address,
      family_member_id: familyMemberId || null,
      is_primary: false,
    })
    .select()
    .single();
  if (chError) throw new Error(`Failed to register number: ${chError.message}`);

  let { data: conversation } = await supabase
    .from("conversations").select("*").eq("client_channel_id", channel.id).maybeSingle();
  if (!conversation) {
    const { data: created, error: convError } = await supabase
      .from("conversations")
      .insert({ client_id: clientId, channel: q.channel, client_channel_id: channel.id })
      .select()
      .single();
    if (convError) throw new Error(`Failed to create conversation: ${convError.message}`);
    conversation = created;
  }

  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    direction: "inbound",
    author: "client",
    body: q.body,
    twilio_sid: q.twilio_sid,
    status: "received",
    created_at: q.received_at,
  });
  if (msgError) throw new Error(`Failed to move message: ${msgError.message}`);

  const current: ConvState = {
    state: conversation.state as ConvState["state"],
    agent_paused: conversation.agent_paused,
    grace_deadline: conversation.grace_deadline,
  };
  const nowIso = new Date().toISOString();
  const next = onInbound(current, nowIso, conversation.grace_seconds ?? 240);
  const { error: updError } = await supabase
    .from("conversations")
    .update({ ...next, last_inbound_at: nowIso, updated_at: nowIso })
    .eq("id", conversation.id);
  if (updError) throw new Error(`Failed to update conversation: ${updError.message}`);

  const { error: delError } = await supabase
    .from("quarantined_messages").delete().eq("id", quarantineId);
  if (delError) throw new Error(`Failed to clear quarantine: ${delError.message}`);

  revalidatePath("/dashboard/conversations");
  revalidatePath("/dashboard/conversations/quarantine");
}

export async function ignoreQuarantined(formData: FormData) {
  const quarantineId = String(formData.get("quarantineId"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("quarantined_messages").delete().eq("id", quarantineId);
  if (error) throw new Error(`Failed to delete: ${error.message}`);
  revalidatePath("/dashboard/conversations/quarantine");
}
```

- [ ] **Step 2: Page** (`quarantine/page.tsx`)

```tsx
import Link from "next/link";

import { getQuarantined } from "@/lib/conversations/queries";
import { relativeTime } from "@/lib/conversations/format";
import { createClient } from "@/lib/supabase/server";

import { claimQuarantined, ignoreQuarantined } from "./actions";

export default async function QuarantinePage() {
  const rows = await getQuarantined();
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients").select("id,first_name,last_name,family_members(id,first_name)")
    .order("last_name");

  return (
    <div>
      <Link href="/dashboard/conversations" className="text-xs text-[#6B665D] underline">
        Back to conversations
      </Link>
      <h1 className="font-serif text-2xl mb-1 mt-2">Unknown numbers</h1>
      <p className="text-sm text-[#8A857B] mb-6">
        Messages from numbers not registered to any client. Claim to attach the number to a person.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[#E4DFD6] bg-white px-6 py-12 text-center text-sm text-[#8A857B]">
          Nothing in quarantine.
        </div>
      ) : (
        <ul className="max-w-2xl space-y-3">
          {rows.map((q) => (
            <li key={q.id} className="rounded-xl border border-[#E4DFD6] bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{q.address}</span>
                <span className="text-[10px] uppercase text-[#A39E94]">
                  {q.channel} · {relativeTime(q.received_at)}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#6B665D]">{q.body}</p>

              <form action={claimQuarantined} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="quarantineId" value={q.id} />
                <select
                  name="clientId"
                  required
                  className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs"
                  defaultValue=""
                >
                  <option value="" disabled>Choose client...</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.last_name}, {c.first_name}</option>
                  ))}
                </select>
                <select
                  name="familyMemberId"
                  className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs"
                  defaultValue=""
                >
                  <option value="">The client themself</option>
                  {(clients ?? []).flatMap((c) =>
                    (c.family_members ?? []).map((m) => (
                      <option key={m.id} value={m.id}>{m.first_name} ({c.last_name})</option>
                    )),
                  )}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-[#A8B2A1] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Claim
                </button>
                <button
                  formAction={ignoreQuarantined}
                  className="rounded-md border border-[#D8D2C8] px-3 py-1.5 text-xs text-[#8A857B] hover:bg-[#EFEBE4]"
                >
                  Ignore
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Note the family-member select is not filtered by chosen client (server-rendered form, no client JS); options carry the family name for disambiguation. Acceptable for a single-operator tool; a Plan 3 polish item if it annoys Meg.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0. Then manual check: insert a quarantined row via `execute_sql`, claim it in the UI, verify the channel + conversation + message rows appear and the quarantine row is gone.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/\(app\)/conversations/quarantine
git commit -m "Add quarantine claiming for unknown numbers"
```

---

### Task 10: Dashboard: household threads on client and family pages

**Files:**
- Create: `app/dashboard/(app)/clients/_components/HouseholdThreads.tsx`
- Create or Modify: `app/dashboard/(app)/clients/actions.ts` (add `addChannel`; create the file with just this action if it does not exist)
- Modify: `app/dashboard/(app)/clients/[id]/page.tsx` (render section)
- Modify: `app/dashboard/(app)/clients/[id]/family/[memberId]/page.tsx` (render section)

**Interfaces:**
- Consumes: `threadTitle`, `relativeTime` (Task 6).
- Produces: `<HouseholdThreads clientId={...} familyMemberId={...} />` server component; `addChannel` server action.

- [ ] **Step 1: The action** (append to or create `app/dashboard/(app)/clients/actions.ts`)

```ts
"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function addChannel(formData: FormData) {
  const clientId = String(formData.get("clientId"));
  const familyMemberId = String(formData.get("familyMemberId") ?? "");
  const channel = String(formData.get("channel"));
  const address = String(formData.get("address") ?? "").trim();
  if (!address.startsWith("+") || !["whatsapp", "sms"].includes(channel)) {
    throw new Error("Number must be E.164 (+44...) and channel whatsapp or sms");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("client_channels").insert({
    client_id: clientId,
    channel,
    address,
    family_member_id: familyMemberId || null,
    is_primary: false,
  });
  if (error) throw new Error(`Failed to add number: ${error.message}`);
  revalidatePath(`/dashboard/clients/${clientId}`);
}
```

(If `clients/actions.ts` already exists with other actions, append `addChannel` without touching them; keep the single `"use server"` directive at the top.)

- [ ] **Step 2: The component** (`clients/_components/HouseholdThreads.tsx`)

```tsx
import Link from "next/link";

import { relativeTime } from "@/lib/conversations/format";
import { createClient } from "@/lib/supabase/server";

import { addChannel } from "../actions";

export async function HouseholdThreads({
  clientId, familyMemberId,
}: {
  clientId: string;
  familyMemberId?: string;
}) {
  const supabase = await createClient();
  let channelQuery = supabase
    .from("client_channels")
    .select("id,address,channel,family_member_id, family_member:family_members(first_name), conversation:conversations(id,state,updated_at)")
    .eq("client_id", clientId);
  if (familyMemberId) channelQuery = channelQuery.eq("family_member_id", familyMemberId);
  const { data: channels, error } = await channelQuery;
  if (error) throw new Error(`Failed to load channels: ${error.message}`);

  const { data: familyMembers } = familyMemberId
    ? { data: null }
    : await supabase.from("family_members").select("id,first_name").eq("client_id", clientId);

  return (
    <section className="mt-8">
      <h2 className="font-serif text-lg mb-3">Conversations</h2>
      {(channels ?? []).length === 0 ? (
        <p className="text-sm text-[#8A857B]">No numbers registered yet.</p>
      ) : (
        <ul className="space-y-2">
          {(channels ?? []).map((ch) => {
            const conv = Array.isArray(ch.conversation) ? ch.conversation[0] : ch.conversation;
            return (
              <li key={ch.id} className="flex items-center justify-between rounded-lg border border-[#E7E2D9] bg-white px-3 py-2.5">
                <div>
                  <span className="text-sm font-medium">
                    {ch.family_member?.first_name ?? "Main"} · {ch.address}
                  </span>
                  <span className="ml-2 text-[10px] uppercase text-[#A39E94]">{ch.channel}</span>
                </div>
                {conv ? (
                  <Link
                    href={`/dashboard/conversations?conversation=${conv.id}`}
                    className="text-xs text-[#6B665D] underline hover:text-[#1F1F1F]"
                  >
                    View thread · {relativeTime(conv.updated_at)}
                  </Link>
                ) : (
                  <span className="text-xs text-[#A39E94]">No messages yet</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form action={addChannel} className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="clientId" value={clientId} />
        {familyMemberId ? (
          <input type="hidden" name="familyMemberId" value={familyMemberId} />
        ) : (
          <select name="familyMemberId" defaultValue="" className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs">
            <option value="">The client themself</option>
            {(familyMembers ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.first_name}</option>
            ))}
          </select>
        )}
        <select name="channel" defaultValue="whatsapp" className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs">
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
        </select>
        <input
          name="address"
          required
          placeholder="+447700900123"
          className="rounded-md border border-[#D8D2C8] bg-white px-2 py-1.5 text-xs"
        />
        <button type="submit" className="rounded-md border border-[#D8D2C8] px-3 py-1.5 text-xs hover:bg-[#EFEBE4]">
          Add number
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 3: Render on both pages**

Read `app/dashboard/(app)/clients/[id]/page.tsx`; import `HouseholdThreads` from `../_components/HouseholdThreads` and render `<HouseholdThreads clientId={id} />` as the LAST child inside the page's outermost returned container (after the existing sections). Do the same in `family/[memberId]/page.tsx` with `<HouseholdThreads clientId={id} familyMemberId={memberId} />` (adjust import depth: `../../../_components/HouseholdThreads`). Use whatever variable names those pages already bind their awaited params to.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0. Manual check via preview: client page shows the section; adding a number creates the row; family page shows only that person's numbers.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/\(app\)/clients
git commit -m "Show household conversations on client and family pages"
```

---

### Task 11: Dashboard: PWA and push subscription

**Files:**
- Create: `public/sw.js`
- Create: `app/manifest.ts`
- Create: `public/icon-192.png`, `public/icon-512.png`
- Create: `app/dashboard/(app)/conversations/push-actions.ts`
- Create: `app/dashboard/(app)/conversations/_components/PushBanner.tsx`
- Modify: `app/dashboard/(app)/conversations/page.tsx` (render banner)
- Modify: `.env.local` (add `NEXT_PUBLIC_VAPID_PUBLIC_KEY=REPLACE_WITH_REAL_KEY`)

**Interfaces:**
- Consumes: `push_subscriptions` table (Task 1).
- Produces: installable PWA; browser subscribes and stores `{endpoint, p256dh, auth}`; daemon (Task 4) reads the same rows.

- [ ] **Step 1: Service worker** (`public/sw.js`)

```js
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "The Life Office", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "The Life Office", {
      body: data.body || "",
      data: { url: data.url || "/dashboard/conversations" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard/conversations";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if ("focus" in win) {
          win.navigate(url);
          return win.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
```

- [ ] **Step 2: Manifest** (`app/manifest.ts`)

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TLO Dashboard",
    short_name: "TLO",
    start_url: "/dashboard/conversations",
    display: "standalone",
    background_color: "#EFEBE4",
    theme_color: "#EFEBE4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- [ ] **Step 3: Icons** (macOS `sips`, from the existing favicon)

```bash
sips -s format png app/favicon.ico --out public/icon-512.png --resampleHeightWidth 512 512
sips -s format png app/favicon.ico --out public/icon-192.png --resampleHeightWidth 192 192
```

If `sips` cannot read the .ico, fall back to generating solid-colour placeholders and note it in the report:

```bash
python3 - <<'EOF'
import struct, zlib
def png(path, size, rgb=(168, 178, 161)):
    raw = b"".join(b"\x00" + bytes(rgb) * size for _ in range(size))
    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
                + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))
png("public/icon-192.png", 192)
png("public/icon-512.png", 512)
EOF
```

- [ ] **Step 4: Subscription actions** (`push-actions.ts`)

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(sub, { onConflict: "endpoint" });
  if (error) throw new Error(`Failed to save subscription: ${error.message}`);
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(`Failed to remove subscription: ${error.message}`);
}
```

- [ ] **Step 5: The banner** (`_components/PushBanner.tsx`)

```tsx
"use client";

import { useEffect, useState } from "react";

import { removePushSubscription, savePushSubscription } from "../push-actions";

type Status = "loading" | "unsupported" | "ios-install" | "ready" | "subscribed" | "denied" | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
}

export function PushBanner() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus(isIOS && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (isIOS && !standalone) {
      setStatus("ios-install");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "ready");
    }).catch(() => setStatus("error"));
  }, []);

  async function subscribe() {
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setStatus("error");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setStatus("subscribed");
    } catch {
      setStatus(Notification.permission === "denied" ? "denied" : "error");
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-[#E7E2D9] bg-white px-4 py-2.5 text-sm">
      {status === "ios-install" ? (
        <span className="text-[#6B665D]">
          To get notifications on iPhone: tap Share, then Add to Home Screen, then open the app from there.
        </span>
      ) : status === "denied" ? (
        <span className="text-[#6B665D]">
          Notifications are blocked in your browser settings for this site.
        </span>
      ) : status === "error" ? (
        <span className="text-[#C0392B]">Could not set up notifications. Try again later.</span>
      ) : status === "subscribed" ? (
        <>
          <span className="text-[#6B665D]">Notifications are on for this device.</span>
          <button onClick={unsubscribe} className="text-xs underline text-[#8A857B]">
            Turn off
          </button>
        </>
      ) : (
        <>
          <span className="text-[#6B665D]">Get notified when clients message.</span>
          <button
            onClick={subscribe}
            className="rounded-md bg-[#A8B2A1] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Enable notifications
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Render the banner** in `conversations/page.tsx`, directly under `<RealtimeConversations />`:

```tsx
      <PushBanner />
```

with the import `import { PushBanner } from "./_components/PushBanner";`.

- [ ] **Step 7: Env placeholder**

Append to `.env.local` (which is gitignored; never commit it):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=REPLACE_WITH_REAL_KEY
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0, all PASS. Manual: load the page in the preview browser, banner renders in "ready" state (or unsupported in headless, in which case it renders nothing and that is correct).

- [ ] **Step 9: Commit**

```bash
git add public/sw.js app/manifest.ts public/icon-192.png public/icon-512.png \
  app/dashboard/\(app\)/conversations
git commit -m "Add PWA manifest, service worker, and push subscription banner"
```

---

### Task 12: Dashboard: triage chips and the agents concierge card

**Files:**
- Create: `app/dashboard/(app)/triage/_components/ConversationChips.tsx`
- Modify: `app/dashboard/(app)/triage/_components/TaskCard.tsx` (render chips)
- Create: `lib/agents/concierge.ts`
- Create: `app/dashboard/(app)/agents/_components/ConciergeCard.tsx`
- Modify: `app/dashboard/(app)/agents/page.tsx` (render card)

**Interfaces:**
- Consumes: `tasks.conversation_id` (Task 1), `service_heartbeats` (Plan 1).
- Produces: chips on typed tasks; concierge status card.

- [ ] **Step 1: Chips component** (`triage/_components/ConversationChips.tsx`)

```tsx
import Link from "next/link";

export function ConversationChips({
  requestType, conversationId,
}: {
  requestType: string | null;
  conversationId: string | null;
}) {
  const typed = requestType === "brief" || requestType === "nudge";
  if (!typed && !conversationId) return null;
  return (
    <div className="mb-3 flex items-center gap-2">
      {typed ? (
        <span className="rounded-full border border-[#D8D2C8] bg-[#EFEBE4] px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-[#6B665D]">
          {requestType}
        </span>
      ) : null}
      {conversationId ? (
        <Link
          href={`/dashboard/conversations?conversation=${conversationId}`}
          className="text-xs text-[#6B665D] underline hover:text-[#1F1F1F]"
        >
          View conversation
        </Link>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Render in TaskCard**

Read `app/dashboard/(app)/triage/_components/TaskCard.tsx`. Import `ConversationChips` and render

```tsx
<ConversationChips requestType={task.request_type} conversationId={task.conversation_id} />
```

as the first element inside the card's main container (immediately before whatever currently renders the title/summary block). The `task` prop already carries the full row (`select *` in `getInboxTasks`), so `conversation_id` is available after Task 1's type regen.

- [ ] **Step 3: Concierge status queries** (`lib/agents/concierge.ts`)

```ts
import { createClient } from "@/lib/supabase/server";

export type ConciergeStatus = {
  live: boolean;
  lastBeat: string | null;
  messagesToday: number;
  awaitingMeg: number;
  quarantined: number;
};

const LIVE_WINDOW_MS = 2 * 60 * 1000;

export async function getConciergeStatus(): Promise<ConciergeStatus> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [heartbeat, messages, awaiting, quarantine] = await Promise.all([
    supabase.from("service_heartbeats").select("beat_at").eq("service", "tlo-concierge").maybeSingle(),
    supabase.from("messages").select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase.from("conversations").select("*", { count: "exact", head: true })
      .eq("state", "awaiting_meg"),
    supabase.from("quarantined_messages").select("*", { count: "exact", head: true }),
  ]);

  const lastBeat = heartbeat.data?.beat_at ?? null;
  const live = lastBeat !== null && Date.now() - new Date(lastBeat).getTime() < LIVE_WINDOW_MS;
  return {
    live,
    lastBeat,
    messagesToday: messages.count ?? 0,
    awaitingMeg: awaiting.count ?? 0,
    quarantined: quarantine.count ?? 0,
  };
}
```

- [ ] **Step 4: The card** (`agents/_components/ConciergeCard.tsx`)

```tsx
import { getConciergeStatus } from "@/lib/agents/concierge";

export async function ConciergeCard() {
  const status = await getConciergeStatus();
  return (
    <div className="rounded-xl border border-[#E4DFD6] bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg">Concierge</h2>
        <span className="flex items-center gap-1.5 text-xs text-[#6B665D]">
          <span className={`h-2 w-2 rounded-full ${status.live ? "bg-[#7BA05B]" : "bg-[#C0392B]"}`} />
          {status.live ? "Live" : "Offline"}
        </span>
      </div>
      <p className="mt-1 text-xs text-[#8A857B]">
        Client messaging daemon on the TPP VPS.
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[#A39E94]">Messages today</dt>
          <dd className="mt-1 font-serif text-xl">{status.messagesToday}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[#A39E94]">Awaiting Meg</dt>
          <dd className="mt-1 font-serif text-xl">{status.awaitingMeg}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[#A39E94]">Quarantined</dt>
          <dd className="mt-1 font-serif text-xl">{status.quarantined}</dd>
        </div>
      </dl>
    </div>
  );
}
```

- [ ] **Step 5: Render on the agents page**

Read `app/dashboard/(app)/agents/page.tsx`. If it has a card grid/list, add `<ConciergeCard />` as a sibling of the existing agent card(s). If it is still a stub, wrap it in the page's existing container conventions:

```tsx
import { ConciergeCard } from "./_components/ConciergeCard";
```

and render the card inside the page's main content area (preserving any existing heading and lead-finder content).

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0, all PASS.

```bash
git add app/dashboard/\(app\)/triage/_components app/dashboard/\(app\)/agents lib/agents
git commit -m "Add triage conversation chips and agents-page concierge card"
```

---

### Task 13: Full verification and ops handoff

**Files:**
- Modify: this plan file (tick checkboxes)
- Modify: `agent/concierge/README.md` (env vars note)

- [ ] **Step 1: Everything, everywhere**

```bash
npx tsc --noEmit && npx vitest run && npx next lint 2>/dev/null || npx eslint .
cd agent/concierge && source .venv/bin/activate && python -m pytest tests/ -v && cd ../..
```

Expected: typecheck clean, all vitest suites pass, lint acceptable (pre-existing warnings tolerated, no new errors), full pytest suite passes.

- [ ] **Step 2: README env note**

Add `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` to the env list in `agent/concierge/README.md`'s "Run locally" section, with one line: push is disabled when `VAPID_PRIVATE_KEY` is unset.

- [ ] **Step 3: Ops handoff checklist** (for Sam; the executing agent CANNOT do these, list them in the final report)

1. Generate VAPID keys locally: `npx --yes web-push generate-vapid-keys`.
2. Public key: set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.local` (replacing the placeholder) and in the Vercel project env.
3. Private key: on the VPS, `secrets set TLO_VAPID_PRIVATE_KEY`, then add `VAPID_PRIVATE_KEY=<value>` and `VAPID_SUBJECT=mailto:sam@theprocesspartners.com` to `/etc/tlo-concierge.env`.
4. Redeploy the daemon: rsync `agent/concierge/` to `/root/tlo-concierge/`, `.venv/bin/pip install -r requirements.txt`, `systemctl restart tlo-concierge`.
5. On Meg's phone: open the dashboard, add to home screen (iOS), enable notifications from the banner.
6. Test: insert an inbound `messages` row + flip its conversation to `awaiting_meg` via SQL; a push should arrive on the subscribed device.

- [ ] **Step 4: Commit**

```bash
git add agent/concierge/README.md docs/superpowers/plans/2026-07-06-conversations-dashboard.md
git commit -m "Complete Plan 2 verification and document push env requirements"
```
