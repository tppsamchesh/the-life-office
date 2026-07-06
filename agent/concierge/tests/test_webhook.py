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


def known_client_db() -> tuple[FakeDB, dict]:
    db = FakeDB()
    db.add_client("client-1")
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    return db, ch


INBOUND_FORM = {"From": "whatsapp:+447700900123", "Body": "Hi Meg", "MessageSid": "SM001"}


def test_health():
    client, _, _ = make_client()
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_inbound_from_known_client_stores_message_and_arms_grace():
    db, _ = known_client_db()
    client, db, _ = make_client(db)
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
    db, _ = known_client_db()
    client, db, _ = make_client(db)
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
    db, _ = known_client_db()
    client, db, _ = make_client(db, FakeGateway(valid_signature=False))
    res = client.post("/twilio/inbound", data=INBOUND_FORM)
    assert res.status_code == 403
    assert db.messages == {}


def test_inbound_while_meg_active_does_not_arm_timer():
    db, ch = known_client_db()
    conv = db.get_or_create_conversation_for_channel(ch)
    db.flag_conversation_for_meg(conv["id"])
    client, db, _ = make_client(db)
    client.post("/twilio/inbound", data=INBOUND_FORM)
    row = db.get_conversation(conv["id"])
    assert row["state"] == "meg_active"
    assert row["grace_deadline"] is None


def test_status_delivered_updates_message():
    db, ch = known_client_db()
    conv = db.get_or_create_conversation_for_channel(ch)
    mid = db.queue_outbound(conv["id"], author="meg", body="On it")
    from datetime import datetime, timezone
    db.mark_sent(mid, "SM100", datetime.now(timezone.utc))
    client, db, _ = make_client(db)
    res = client.post("/twilio/status", data={"MessageSid": "SM100", "MessageStatus": "delivered"})
    assert res.status_code == 200
    assert db.get_message(mid)["status"] == "delivered"


def test_status_failed_flags_conversation_for_meg():
    db, ch = known_client_db()
    conv = db.get_or_create_conversation_for_channel(ch)
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


def test_inbound_creates_conversation_linked_to_channel():
    db, _ = known_client_db()
    client, db, _ = make_client(db)
    client.post("/twilio/inbound", data=INBOUND_FORM)
    conv = list(db.conversations.values())[0]
    assert conv["client_channel_id"] is not None
