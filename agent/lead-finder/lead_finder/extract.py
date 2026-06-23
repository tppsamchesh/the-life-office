from __future__ import annotations

import re

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_ASSET_EXTS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js")


def extract_emails(text: str) -> list[str]:
    """Pull published email addresses out of page text. Lowercased, de-duplicated,
    first-seen order, with image/asset false positives (logo@2x.png) dropped.
    (No paid enrichment — this is how v1 gets contacts.)"""
    seen: dict[str, None] = {}
    for match in _EMAIL_RE.findall(text or ""):
        lowered = match.lower()
        if lowered.endswith(_ASSET_EXTS):
            continue
        seen.setdefault(lowered, None)
    return list(seen.keys())
