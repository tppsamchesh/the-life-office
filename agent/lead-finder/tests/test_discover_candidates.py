from lead_finder.tools.discover_candidates import discover_candidates


class FakeSearch:
    def __init__(self, web=None, raw=None):
        self._web = web or {}
        self._raw = raw or {}

    def web(self, query):
        return self._web.get(query, [])

    def raw(self, query):
        for key, value in self._raw.items():
            if key in query:
                return value
        return []


class FakeCrawl:
    def __init__(self, pages):
        self.pages = pages  # url -> {"html":..., "text":...}

    def fetch(self, url):
        if url not in self.pages:
            raise RuntimeError("404")
        return self.pages[url]


HOME_HTML = '<a href="/team">Our team</a> <a href="/services">Services</a> info@acme.co.uk'
TEAM_TEXT = "Jane Smith, Managing Director. Email jane.smith@acme.co.uk to talk."


def _crawl():
    return FakeCrawl(
        {
            "https://acme.co.uk/": {"html": HOME_HTML, "text": "Reach us at info@acme.co.uk"},
            "https://acme.co.uk/team": {"html": TEAM_TEXT, "text": TEAM_TEXT},
        }
    )


def _search():
    return FakeSearch(
        web={"wealth managers Surrey": ["https://acme.co.uk/"]},
        raw={"linkedin.com/company": ["https://uk.linkedin.com/company/acme-wealth"]},
    )


def test_discover_finds_personal_email_from_the_team_page():
    res = discover_candidates(
        "partner_directory", queries=["wealth managers Surrey"], search=_search(), crawl=_crawl()
    )
    c = res["candidates"][0]
    assert "jane.smith@acme.co.uk" in c["contact_emails"]
    assert c["best_email"] == "jane.smith@acme.co.uk"
    assert c["best_email_type"] == "personal"


def test_discover_surfaces_company_linkedin_and_person_evidence():
    res = discover_candidates(
        "partner_directory", queries=["wealth managers Surrey"], search=_search(), crawl=_crawl()
    )
    c = res["candidates"][0]
    assert c["company_linkedin"] == "https://uk.linkedin.com/company/acme-wealth"
    assert "Managing Director" in c["evidence"]
    assert c["lead_type"] == "partner"
    assert c["source_type"] == "partner_directory"


def test_discover_skips_firms_whose_homepage_fails():
    search = FakeSearch(web={"q": ["https://good.co.uk/", "https://bad.co.uk/"]})
    crawl = FakeCrawl({"https://good.co.uk/": {"html": "info@good.co.uk", "text": "info@good.co.uk"}})
    res = discover_candidates("partner_directory", queries=["q"], search=search, crawl=crawl)
    assert [c["source_url"] for c in res["candidates"]] == ["https://good.co.uk/"]


def test_discover_no_results_when_search_empty():
    res = discover_candidates(
        "partner_directory", queries=["nothing"], search=FakeSearch(), crawl=FakeCrawl({})
    )
    assert res["status"] == "no_results"
    assert res["candidates"] == []
