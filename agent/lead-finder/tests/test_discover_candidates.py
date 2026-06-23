from lead_finder.tools.discover_candidates import discover_candidates


class FakeSearch:
    def __init__(self, mapping):
        self.mapping = mapping

    def web(self, query):
        return self.mapping.get(query, [])


class FakeCrawl:
    def __init__(self, pages):
        self.pages = pages

    def read(self, url):
        if url not in self.pages:
            raise RuntimeError("404")
        return self.pages[url]


def test_discover_returns_partner_candidate_with_published_email():
    search = FakeSearch({"wealth managers Surrey": ["https://acmewealth.co.uk"]})
    crawl = FakeCrawl({"https://acmewealth.co.uk": "Email hello@AcmeWealth.co.uk to chat"})

    result = discover_candidates(
        "partner_directory",
        queries=["wealth managers Surrey"],
        search=search,
        crawl=crawl,
    )

    assert result["status"] == "success"
    assert len(result["candidates"]) == 1
    c = result["candidates"][0]
    assert c["source_url"] == "https://acmewealth.co.uk"
    assert c["contact_emails"] == ["hello@acmewealth.co.uk"]
    assert c["lead_type"] == "partner"
    assert c["source_type"] == "partner_directory"


def test_discover_skips_pages_that_fail_to_crawl():
    search = FakeSearch({"q": ["https://good.co.uk", "https://bad.co.uk"]})
    crawl = FakeCrawl({"https://good.co.uk": "email a@good.co.uk"})  # bad.co.uk raises

    result = discover_candidates("partner_directory", queries=["q"], search=search, crawl=crawl)

    assert result["status"] == "success"
    assert [c["source_url"] for c in result["candidates"]] == ["https://good.co.uk"]


def test_discover_returns_no_results_when_search_is_empty():
    result = discover_candidates(
        "partner_directory", queries=["nothing"], search=FakeSearch({}), crawl=FakeCrawl({})
    )
    assert result["status"] == "no_results"
    assert result["candidates"] == []
