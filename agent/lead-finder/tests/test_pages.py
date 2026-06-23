from lead_finder.pages import find_contact_pages

HTML = """
<a href="/about-us">About us</a>
<a href="/our-team/">Meet the team</a>
<a href="https://acme.co.uk/contact">Contact</a>
<a href="/services">Services</a>
<a href="https://other.com/team">External team</a>
"""


def test_find_contact_pages_keeps_same_domain_relevant_pages():
    pages = find_contact_pages("https://acme.co.uk/", HTML)
    assert "https://acme.co.uk/our-team/" in pages
    assert "https://acme.co.uk/about-us" in pages
    assert "https://acme.co.uk/contact" in pages


def test_find_contact_pages_drops_external_and_irrelevant():
    pages = find_contact_pages("https://acme.co.uk/", HTML)
    assert all("acme.co.uk" in p for p in pages)
    assert not any("/services" in p for p in pages)


def test_find_contact_pages_prioritises_people_pages_first():
    pages = find_contact_pages("https://acme.co.uk/", HTML)
    assert pages[0] == "https://acme.co.uk/our-team/"
