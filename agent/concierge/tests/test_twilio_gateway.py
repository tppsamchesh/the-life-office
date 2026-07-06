from twilio.request_validator import RequestValidator

from concierge.config import Config
from concierge.twilio_gateway import TwilioGateway

CFG = Config(
    supabase_url="https://example.supabase.co",
    supabase_service_key="svc",
    twilio_account_sid="AC" + "0" * 32,
    twilio_auth_token="token123",
    twilio_whatsapp_from="whatsapp:+447700900000",
    twilio_sms_from="+15550001111",
    public_base_url="https://tlo-concierge.example.com",
)


def test_validate_signature_accepts_valid_signature():
    gw = TwilioGateway(CFG)
    url = "https://tlo-concierge.example.com/twilio/inbound"
    params = {"From": "whatsapp:+447700900123", "Body": "Hi", "MessageSid": "SM1"}
    good = RequestValidator("token123").compute_signature(url, params)
    assert gw.validate_signature(url, params, good) is True


def test_validate_signature_rejects_bad_signature():
    gw = TwilioGateway(CFG)
    url = "https://tlo-concierge.example.com/twilio/inbound"
    assert gw.validate_signature(url, {"Body": "Hi"}, "not-a-real-signature") is False


def test_from_number_selection():
    gw = TwilioGateway(CFG)
    assert gw.from_number("whatsapp") == "whatsapp:+447700900000"
    assert gw.from_number("sms") == "+15550001111"
