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
        conv = db.get_or_create_conversation_for_channel(channel_row)
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
