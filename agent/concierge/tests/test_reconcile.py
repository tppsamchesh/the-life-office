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


def make_db() -> tuple[FakeDB, dict]:
    db = FakeDB()
    db.add_client("client-1")
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    return db, ch


def test_recovers_missed_message_and_arms_grace():
    db, _ = make_db()
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
    db, ch = make_db()
    conv = db.get_or_create_conversation_for_channel(ch)
    db.insert_inbound(conv["id"], "already here", "SM900")
    gw = FakeGateway()
    gw.inbound_history = [
        InboundMessage("whatsapp", "+447700900123", "already here", "SM900"),
    ]
    assert reconcile_once(db, gw, CFG, NOW) == 0


def test_unknown_number_goes_to_quarantine():
    db, _ = make_db()
    gw = FakeGateway()
    gw.inbound_history = [InboundMessage("sms", "+15550009999", "who dis", "SM901")]
    assert reconcile_once(db, gw, CFG, NOW) == 0
    assert len(db.quarantined) == 1


def test_gateway_error_is_swallowed():
    db, _ = make_db()

    class BrokenGateway:
        def list_recent_inbound(self, since):
            raise RuntimeError("twilio api down")

    assert reconcile_once(db, BrokenGateway(), CFG, NOW) == 0
