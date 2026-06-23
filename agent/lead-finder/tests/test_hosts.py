from lead_finder.hosts import filter_search_hits


def test_filter_drops_social_and_aggregator_hosts_keeps_firm_sites():
    urls = [
        "https://www.linkedin.com/in/someone",
        "https://acmewealth.co.uk/team",
        "https://m.facebook.com/acme",
        "https://en.wikipedia.org/wiki/Acme",
    ]
    assert filter_search_hits(urls) == ["https://acmewealth.co.uk/team"]


def test_filter_skips_unparseable_urls():
    assert filter_search_hits(["not a url", "https://good.co.uk"]) == ["https://good.co.uk"]
