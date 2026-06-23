from __future__ import annotations

from urllib.parse import urlparse

# Social / aggregator / reference hosts that aren't a firm's own site.
_JUNK = (
    "linkedin.",
    "facebook.",
    "instagram.",
    "twitter.",
    "x.com",
    "youtube.",
    "pinterest.",
    "tiktok.",
    "wikipedia.",
    "crunchbase.",
    "indeed.",
    "glassdoor.",
    "companieshouse.",
    "find-and-update.company-information.service.gov.uk",
    "gov.uk",
)


def _host(url: str) -> str | None:
    try:
        host = urlparse(url).hostname
    except ValueError:
        return None
    if not host:
        return None
    return host.lower().removeprefix("www.")


def filter_search_hits(urls) -> list[str]:
    """Keep firm sites; drop social/aggregator/reference hosts and unparseable URLs."""
    kept = []
    for url in urls:
        host = _host(url)
        if host is None:
            continue
        if any(j in host for j in _JUNK):
            continue
        kept.append(url)
    return kept
