"""Twilio wrapper: the only module allowed to import the twilio SDK."""
from datetime import datetime

from twilio.request_validator import RequestValidator
from twilio.rest import Client

from concierge.channels import InboundMessage, to_twilio_address
from concierge.config import Config

_WHATSAPP_PREFIX = "whatsapp:"


class TwilioGateway:
    def __init__(self, cfg: Config) -> None:
        self._client = Client(cfg.twilio_account_sid, cfg.twilio_auth_token)
        self._validator = RequestValidator(cfg.twilio_auth_token)
        self._whatsapp_from = cfg.twilio_whatsapp_from
        self._sms_from = cfg.twilio_sms_from

    def from_number(self, channel: str) -> str:
        return self._whatsapp_from if channel == "whatsapp" else self._sms_from

    def send(self, channel: str, to_address: str, body: str, status_callback: str) -> str:
        message = self._client.messages.create(
            from_=self.from_number(channel),
            to=to_twilio_address(channel, to_address),
            body=body,
            status_callback=status_callback,
        )
        return message.sid

    def validate_signature(self, url: str, params: dict, signature: str) -> bool:
        return bool(self._validator.validate(url, params, signature))

    def list_recent_inbound(self, since: datetime) -> list[InboundMessage]:
        out: list[InboundMessage] = []
        for m in self._client.messages.list(date_sent_after=since, limit=200):
            if m.direction != "inbound":
                continue
            raw = m.from_ or ""
            if raw.startswith(_WHATSAPP_PREFIX):
                channel, address = "whatsapp", raw[len(_WHATSAPP_PREFIX):]
            else:
                channel, address = "sms", raw
            out.append(InboundMessage(channel=channel, address=address,
                                      body=m.body or "", twilio_sid=m.sid))
        return out
