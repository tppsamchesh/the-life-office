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
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation_for_channel(ch)
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
    db.add_client("client-2")
    ch = db.add_channel("client-2", "sms", "+15550001111")
    conv = db.get_or_create_conversation_for_channel(ch)
    db.channels.clear()  # channel deleted after the message was queued
    mid = db.queue_outbound(conv["id"], author="meg", body="x")
    gw = FakeGateway()
    process_queued_once(db, gw, CFG, NOW)
    assert db.get_message(mid)["status"] == "failed"
    assert gw.sent == []


def test_missing_conversation_is_cancelled_not_sent():
    db, conv_id = make_db()
    mid = db.queue_outbound(conv_id, author="meg", body="x")
    # Simulate orphaned message: delete the conversation it points to
    del db.conversations[conv_id]
    gw = FakeGateway()
    process_queued_once(db, gw, CFG, NOW)
    assert db.get_message(mid)["status"] == "cancelled"
    assert gw.sent == []


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
