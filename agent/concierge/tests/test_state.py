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
