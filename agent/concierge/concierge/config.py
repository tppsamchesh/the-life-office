"""Environment-driven configuration for the concierge daemon."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    supabase_url: str
    supabase_service_key: str
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_whatsapp_from: str
    twilio_sms_from: str
    public_base_url: str
    port: int = 8090
    grace_default_seconds: int = 240
    poll_interval_seconds: int = 5
    max_send_attempts: int = 5


def load_config(env: dict[str, str] | None = None) -> Config:
    e: dict[str, str] = dict(os.environ) if env is None else env
    return Config(
        supabase_url=e["SUPABASE_URL"],
        supabase_service_key=e["SUPABASE_SERVICE_KEY"],
        twilio_account_sid=e["TWILIO_ACCOUNT_SID"],
        twilio_auth_token=e["TWILIO_AUTH_TOKEN"],
        twilio_whatsapp_from=e["TWILIO_WHATSAPP_FROM"],
        twilio_sms_from=e["TWILIO_SMS_FROM"],
        public_base_url=e["PUBLIC_BASE_URL"].rstrip("/"),
        port=int(e.get("PORT", "8090")),
        grace_default_seconds=int(e.get("GRACE_DEFAULT_SECONDS", "240")),
        poll_interval_seconds=int(e.get("POLL_INTERVAL_SECONDS", "5")),
        max_send_attempts=int(e.get("MAX_SEND_ATTEMPTS", "5")),
    )
