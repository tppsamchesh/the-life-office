"""FastAPI webhook receiver. Twilio posts urlencoded forms; we answer empty TwiML."""
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request, Response

from concierge.channels import parse_inbound
from concierge.config import Config
from concierge.state import ConvState, on_inbound
from concierge.timeutil import parse_ts

logger = logging.getLogger(__name__)


def _twiml_empty() -> Response:
    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="application/xml",
    )


def create_app(db, gateway, cfg: Config) -> FastAPI:
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    async def _validated_form(request: Request, path: str) -> dict[str, str]:
        form = {k: str(v) for k, v in (await request.form()).items()}
        signature = request.headers.get("X-Twilio-Signature", "")
        url = cfg.public_base_url + path
        if not gateway.validate_signature(url, form, signature):
            logger.warning("rejected webhook with invalid signature on %s", path)
            raise HTTPException(status_code=403, detail="invalid signature")
        return form

    @app.get("/health")
    async def health() -> dict:
        return {"ok": True}

    @app.post("/twilio/inbound")
    async def inbound(request: Request) -> Response:
        form = await _validated_form(request, "/twilio/inbound")
        msg = parse_inbound(form)
        channel_row = db.resolve_channel(msg.channel, msg.address)
        if channel_row is None:
            db.quarantine(msg.channel, msg.address, msg.body, msg.twilio_sid)
            logger.info("quarantined message from unknown %s number", msg.channel)
            return _twiml_empty()
        conv = db.get_or_create_conversation_for_channel(channel_row)
        if not db.insert_inbound(conv["id"], msg.body, msg.twilio_sid):
            return _twiml_empty()  # duplicate webhook delivery
        now = datetime.now(timezone.utc)
        current = ConvState(
            state=conv["state"],
            agent_paused=conv["agent_paused"],
            grace_deadline=parse_ts(conv.get("grace_deadline")),
        )
        grace_seconds = conv.get("grace_seconds") or cfg.grace_default_seconds
        db.apply_state(conv["id"], on_inbound(current, now, grace_seconds), last_inbound_at=now)
        return _twiml_empty()

    @app.post("/twilio/status")
    async def status(request: Request) -> Response:
        form = await _validated_form(request, "/twilio/status")
        sid = form.get("MessageSid", "")
        message_status = form.get("MessageStatus", "")
        now = datetime.now(timezone.utc)
        if message_status == "delivered":
            db.set_delivery_status(sid, "delivered", now)
        elif message_status in ("failed", "undelivered"):
            row = db.set_delivery_status(sid, "failed", now)
            if row is not None:
                db.flag_conversation_for_meg(row["conversation_id"])
                logger.warning("delivery failed for message %s; conversation flagged for Meg", sid)
        return _twiml_empty()

    return app
