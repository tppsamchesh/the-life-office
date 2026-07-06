from datetime import datetime, timedelta, timezone

from concierge.grace import log_agent_turn, process_graces_once
from concierge.state import ConvState
from tests.fakes import FakeDB

NOW = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)


def make_db_with_waiting_conversation() -> tuple[FakeDB, str]:
    db = FakeDB()
    db.add_client("client-1")
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation_for_channel(ch)
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
