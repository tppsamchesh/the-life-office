import pytest

from concierge.config import load_config

BASE_ENV = {
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_SERVICE_KEY": "service-key",
    "TWILIO_ACCOUNT_SID": "AC123",
    "TWILIO_AUTH_TOKEN": "token123",
    "TWILIO_WHATSAPP_FROM": "whatsapp:+447700900000",
    "TWILIO_SMS_FROM": "+15550001111",
    "PUBLIC_BASE_URL": "https://tlo-concierge.example.com/",
}


def test_load_config_reads_env_and_applies_defaults():
    cfg = load_config(BASE_ENV)
    assert cfg.twilio_account_sid == "AC123"
    assert cfg.public_base_url == "https://tlo-concierge.example.com"  # trailing slash stripped
    assert cfg.port == 8090
    assert cfg.grace_default_seconds == 240
    assert cfg.poll_interval_seconds == 5
    assert cfg.max_send_attempts == 5


def test_load_config_reads_overrides():
    env = dict(BASE_ENV)
    env["PORT"] = "9000"
    env["GRACE_DEFAULT_SECONDS"] = "120"
    cfg = load_config(env)
    assert cfg.port == 9000
    assert cfg.grace_default_seconds == 120


def test_load_config_missing_required_var_raises():
    env = dict(BASE_ENV)
    del env["TWILIO_AUTH_TOKEN"]
    with pytest.raises(KeyError):
        load_config(env)
