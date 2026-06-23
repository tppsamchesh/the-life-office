from lead_finder.tools.lookup_person import lookup_person


class FakeSearch:
    def __init__(self, results):
        self.results = results
        self.last_query = None

    def raw(self, query):
        self.last_query = query
        return self.results


def test_lookup_person_returns_profile_url():
    s = FakeSearch(["https://acme.co.uk/team", "https://www.linkedin.com/in/jane-smith-1a2b"])
    out = lookup_person("Jane Smith", "Acme Wealth", search=s)
    assert out["status"] == "success"
    assert out["linkedin_url"] == "https://www.linkedin.com/in/jane-smith-1a2b"
    assert "Jane Smith" in s.last_query


def test_lookup_person_no_results_when_no_profile():
    out = lookup_person("Jane Smith", "Acme", search=FakeSearch(["https://acme.co.uk/team"]))
    assert out["status"] == "no_results"
    assert out["linkedin_url"] is None


def test_lookup_person_requires_a_name():
    assert lookup_person("", "Acme", search=FakeSearch([]))["status"] == "error"
