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
