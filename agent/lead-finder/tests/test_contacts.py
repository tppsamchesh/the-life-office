from lead_finder.contacts import best_email, classify_email


def test_classify_generic_mailboxes():
    assert classify_email("info@acme.co.uk") == "generic"
    assert classify_email("hello@acme.co.uk") == "generic"
    assert classify_email("enquiries@acme.co.uk") == "generic"


def test_classify_role_mailboxes():
    assert classify_email("partnerships@acme.co.uk") == "role"
    assert classify_email("newbusiness@acme.co.uk") == "role"


def test_classify_personal_mailboxes():
    assert classify_email("jane.smith@acme.co.uk") == "personal"
    assert classify_email("j.smith@acme.co.uk") == "personal"


def test_best_email_prefers_personal_then_role_then_generic():
    emails = ["info@acme.co.uk", "partnerships@acme.co.uk", "jane.smith@acme.co.uk"]
    assert best_email(emails) == ("jane.smith@acme.co.uk", "personal")


def test_best_email_none_when_empty():
    assert best_email([]) is None
