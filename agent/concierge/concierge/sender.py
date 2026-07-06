"""Outbound queue worker. The single writer to Twilio."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from concierge.config import Config

logger = logging.getLogger(__name__)


def process_queued_once(db, gateway, cfg: Config, now: datetime, pusher=None) -> int:
    sent_count = 0
    for row in db.fetch_due_outbound(now):
        conv = db.get_conversation(row["conversation_id"])
        if conv is None:
            db.mark_cancelled(row["id"])
            continue
        if row["author"] == "agent" and (
            conv["agent_paused"] or db.meg_activity_since(conv["id"], row["created_at"])
        ):
            db.mark_cancelled(row["id"])
            logger.info("agent message %s stood down (Meg is active)", row["id"])
            continue
        address = db.conversation_address(conv)
        if address is None:
            db.record_send_failure(row["id"], "no channel address for client",
                                   attempts=cfg.max_send_attempts,
                                   next_attempt_at=None, terminal=True)
            db.flag_conversation_for_meg(conv["id"])
            logger.error("no %s address for client %s", conv["channel"], conv["client_id"])
            if pusher is not None:
                pusher.notify_send_failure(conv)
            continue
        db.mark_sending(row["id"])
        try:
            sid = gateway.send(
                conv["channel"], address, row["body"],
                cfg.public_base_url + "/twilio/status",
            )
            db.mark_sent(row["id"], sid, now)
            sent_count += 1
        except Exception as exc:  # any Twilio/network error
            attempts = row["send_attempts"] + 1
            terminal = attempts >= cfg.max_send_attempts
            next_at = None if terminal else now + timedelta(seconds=10 * 2 ** attempts)
            db.record_send_failure(row["id"], str(exc), attempts, next_at, terminal)
            if terminal:
                db.flag_conversation_for_meg(conv["id"])
                logger.error("message %s failed terminally: %s", row["id"], exc)
                if pusher is not None:
                    pusher.notify_send_failure(conv)
            else:
                logger.warning("send attempt %d failed for %s: %s", attempts, row["id"], exc)
    return sent_count


async def sender_loop(db, gateway, cfg: Config, stop: asyncio.Event, pusher=None) -> None:
    while not stop.is_set():
        try:
            process_queued_once(db, gateway, cfg, datetime.now(timezone.utc), pusher)
        except Exception:
            logger.exception("sender loop iteration failed")
        try:
            await asyncio.wait_for(stop.wait(), timeout=cfg.poll_interval_seconds)
        except asyncio.TimeoutError:
            pass
