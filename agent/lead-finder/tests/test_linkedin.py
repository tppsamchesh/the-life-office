from lead_finder.linkedin import pick_linkedin


def test_pick_company_linkedin_url():
    urls = [
        "https://acme.co.uk",
        "https://uk.linkedin.com/company/acme-wealth",
        "https://www.linkedin.com/in/jane",
    ]
    assert pick_linkedin(urls, "company") == "https://uk.linkedin.com/company/acme-wealth"


def test_pick_person_linkedin_url():
    urls = [
        "https://linkedin.com/company/acme",
        "https://www.linkedin.com/in/jane-smith-1a2b3c",
    ]
    assert pick_linkedin(urls, "person") == "https://www.linkedin.com/in/jane-smith-1a2b3c"


def test_pick_linkedin_none_when_absent():
    assert pick_linkedin(["https://acme.co.uk/team"], "person") is None


def test_pick_company_rejects_irrelevant_slug_when_firm_given():
    # Real bug: "Wren Sterling" must NOT match linkedin.com/company/usa-wrestling.
    urls = ["https://www.linkedin.com/company/usa-wrestling"]
    assert pick_linkedin(urls, "company", match="Wren Sterling") is None


def test_pick_company_accepts_matching_slug():
    urls = ["https://uk.linkedin.com/company/amber-river"]
    assert pick_linkedin(urls, "company", match="Amber River") == (
        "https://uk.linkedin.com/company/amber-river"
    )
