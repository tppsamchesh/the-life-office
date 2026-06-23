from __future__ import annotations

from lead_finder.extract import extract_emails

# mode -> (lead_type, source_type)
_MODE = {
    "partner_directory": ("partner", "partner_directory"),
    "published_prospect": ("prospect", "signal"),
}


def discover_candidates(mode: str, *, queries, search, crawl) -> dict:
    """Search for candidates and read their pages for a published contact.

    `search` has web(query) -> [urls]; `crawl` has read(url) -> page text.
    Returns a structured status: success | no_results | error.
    """
    lead_type, source_type = _MODE[mode]
    candidates = []
    for query in queries:
        for url in search.web(query):
            try:
                text = crawl.read(url)
            except Exception:  # noqa: BLE001 — a blocked/empty fetch skips, never crashes
                continue
            candidates.append(
                {
                    "source_url": url,
                    "source_type": source_type,
                    "lead_type": lead_type,
                    "contact_emails": extract_emails(text),
                    "evidence": text[:500],
                }
            )
    return {"status": "success" if candidates else "no_results", "candidates": candidates}
