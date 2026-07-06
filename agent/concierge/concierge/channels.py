"""Normalise Twilio webhook payloads to channel-agnostic values and back."""
from dataclasses import dataclass

_WHATSAPP_PREFIX = "whatsapp:"


@dataclass(frozen=True)
class InboundMessage:
    channel: str  # 'whatsapp' | 'sms'
    address: str  # E.164, no prefix
    body: str
    twilio_sid: str


def parse_inbound(form: dict[str, str]) -> InboundMessage:
    raw_from = form["From"]
    if raw_from.startswith(_WHATSAPP_PREFIX):
        channel = "whatsapp"
        address = raw_from[len(_WHATSAPP_PREFIX):]
    else:
        channel = "sms"
        address = raw_from
    return InboundMessage(
        channel=channel,
        address=address,
        body=form.get("Body", ""),
        twilio_sid=form["MessageSid"],
    )


def to_twilio_address(channel: str, address: str) -> str:
    return f"{_WHATSAPP_PREFIX}{address}" if channel == "whatsapp" else address
