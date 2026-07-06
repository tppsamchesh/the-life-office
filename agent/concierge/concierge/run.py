"""Daemon entrypoint: python -m concierge.run"""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn

from concierge.config import load_config
from concierge.db import ConciergeDB
from concierge.grace import grace_loop, log_agent_turn
from concierge.reconcile import reconcile_once
from concierge.sender import sender_loop
from concierge.twilio_gateway import TwilioGateway
from concierge.webhook import create_app


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger = logging.getLogger("concierge.run")
    cfg = load_config()
    db = ConciergeDB(cfg)
    gateway = TwilioGateway(cfg)

    recovered = reconcile_once(db, gateway, cfg, datetime.now(timezone.utc))
    logger.info("startup reconciliation recovered %d message(s)", recovered)

    stranded = db.reset_stranded_sending()
    logger.info("startup sweep requeued %d stranded sending message(s)", stranded)

    app = create_app(db, gateway, cfg)

    @asynccontextmanager
    async def lifespan(_app):
        stop = asyncio.Event()
        tasks = [
            asyncio.create_task(sender_loop(db, gateway, cfg, stop)),
            asyncio.create_task(grace_loop(db, log_agent_turn, cfg, stop)),
        ]
        logger.info("background loops started")
        yield
        stop.set()
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("background loops stopped")

    app.router.lifespan_context = lifespan
    uvicorn.run(app, host="127.0.0.1", port=cfg.port, log_level="info")


if __name__ == "__main__":
    main()
