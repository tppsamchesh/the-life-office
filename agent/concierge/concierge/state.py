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
