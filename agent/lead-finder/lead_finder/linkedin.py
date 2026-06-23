from __future__ import annotations

import re

# Identify a LinkedIn company or person URL from a list of search-result links.
# We only read the public URL — we never crawl LinkedIn itself.
_PATH = {"company": "/company/", "person": "/in/"}


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _tokens(s: str) -> list[str]:
    toks = [t for t in re.split(r"[^a-z0-9]+", s.lower()) if len(t) >= 4]
    return toks or [_norm(s)]


def pick_linkedin(urls, kind: str, match: str | None = None) -> str | None:
    """First LinkedIn URL of the right kind. If `match` (firm/person name) is given,
    only accept a URL whose slug shares a token with it — guards against grabbing an
    unrelated profile from search results."""
    needle = _PATH[kind]
    for url in urls:
        low = (url or "").lower()
        if "linkedin." not in low or needle not in low:
            continue
        if match:
            slug = _norm(low.split(needle, 1)[1].split("/")[0].split("?")[0])
            if not slug:
                continue
            if not any(t in slug or slug in t for t in _tokens(match)):
                continue
        return url
    return None
