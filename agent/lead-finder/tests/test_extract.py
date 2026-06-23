from lead_finder.extract import extract_emails


def test_extracts_and_normalizes_a_single_email():
    assert extract_emails("Reach us at Hello@Acme.co.uk today") == ["hello@acme.co.uk"]


def test_ignores_image_and_asset_false_positives():
    text = "logo@2x.png sprite@icon.svg but real@firm.com"
    assert extract_emails(text) == ["real@firm.com"]
