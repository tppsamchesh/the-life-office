import pytest

from concierge.channels import InboundMessage, parse_inbound, to_twilio_address


def test_parse_whatsapp_inbound():
    form = {"From": "whatsapp:+447700900123", "Body": "Hi Meg", "MessageSid": "SM001"}
    msg = parse_inbound(form)
    assert msg == InboundMessage(
        channel="whatsapp", address="+447700900123", body="Hi Meg", twilio_sid="SM001"
    )


def test_parse_sms_inbound():
    form = {"From": "+16175550100", "Body": "Hey", "MessageSid": "SM002"}
    msg = parse_inbound(form)
    assert msg.channel == "sms"
    assert msg.address == "+16175550100"


def test_parse_missing_body_defaults_to_empty_string():
    form = {"From": "+16175550100", "MessageSid": "SM003"}
    assert parse_inbound(form).body == ""


def test_parse_missing_from_raises_key_error():
    with pytest.raises(KeyError):
        parse_inbound({"Body": "x", "MessageSid": "SM004"})


def test_to_twilio_address_whatsapp_adds_prefix():
    assert to_twilio_address("whatsapp", "+447700900123") == "whatsapp:+447700900123"


def test_to_twilio_address_sms_is_bare():
    assert to_twilio_address("sms", "+16175550100") == "+16175550100"
