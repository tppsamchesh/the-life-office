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


def test_reset_stranded_sending_requeues_and_counts():
    db = make_db()
    conv = db.get_or_create_conversation("client-1", "whatsapp")
    stranded_id = db.queue_outbound(conv["id"], author="meg", body="stuck mid-send")
    queued_id = db.queue_outbound(conv["id"], author="meg", body="still queued")
    sent_id = db.queue_outbound(conv["id"], author="meg", body="already sent")
    db.messages[stranded_id]["status"] = "sending"
    db.mark_sent(sent_id, "SM500", NOW)

    count = db.reset_stranded_sending()

    assert count == 1
    assert db.get_message(stranded_id)["status"] == "queued"
    assert db.get_message(queued_id)["status"] == "queued"
    assert db.get_message(sent_id)["status"] == "sent"


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
