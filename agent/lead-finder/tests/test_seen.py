from lead_finder.seen import build_seen_index


def test_build_seen_index_normalizes_and_unions_leads_and_clients():
    leads = [{"email": "A@x.com", "source_url": "https://x.com/p/"}]
    clients = [{"email": "B@y.com"}]

    idx = build_seen_index(leads, clients)

    assert idx["emails"] == {"a@x.com", "b@y.com"}
    assert idx["urls"] == {"https://x.com/p"}


def test_build_seen_index_ignores_blank_contacts():
    idx = build_seen_index([{"email": None, "source_url": ""}], [{"email": ""}])
    assert idx == {"emails": set(), "urls": set()}
