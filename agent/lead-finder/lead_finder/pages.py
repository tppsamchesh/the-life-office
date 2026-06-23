from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

_ANCHOR = re.compile(r"<a\s[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", re.DOTALL | re.IGNORECASE)
_TAGS = re.compile(r"<[^>]+>")

# Page types in priority order — a named person is most likely on a people page.
_BUCKETS = [
    ("people", ("our-team", "our team", "the-team", "meet", "people", "advisers",
                "advisors", "partners", "leadership", "our-people")),
    ("about", ("about", "who-we-are", "who we are")),
    ("contact", ("contact", "get-in-touch")),
]


def _host(url: str) -> str | None:
    try:
        return (urlparse(url).hostname or "").lower().removeprefix("www.")
    except ValueError:
        return None


def find_contact_pages(base_url: str, html: str, limit: int = 4) -> list[str]:
    """From a homepage's HTML, return same-domain team/about/contact page URLs,
    people-pages first — the pages most likely to name a decision-maker."""
    base_host = _host(base_url)
    ranked: list[tuple[int, str]] = []
    seen = set()

    for href, inner in _ANCHOR.findall(html):
        url = urljoin(base_url, href.strip())
        if _host(url) != base_host:
            continue
        haystack = f"{href} {_TAGS.sub(' ', inner)}".lower()
        for rank, (_, keywords) in enumerate(_BUCKETS):
            if any(k in haystack for k in keywords):
                key = url.split("#", 1)[0]
                if key not in seen:
                    seen.add(key)
                    ranked.append((rank, key))
                break

    ranked.sort(key=lambda pair: pair[0])
    return [url for _, url in ranked[:limit]]
