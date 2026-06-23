from __future__ import annotations

from lead_finder.guards import normalize_email, normalize_url


def build_seen_index(leads, clients) -> dict:
    """Build the dedup index create_lead checks against: normalized emails from
    existing leads + clients, and normalized source URLs from existing leads."""
    emails = set()
    urls = set()
    for row in leads:
        email = normalize_email(row.get("email"))
        if email:
            emails.add(email)
        url = normalize_url(row.get("source_url"))
        if url:
            urls.add(url)
    for row in clients:
        email = normalize_email(row.get("email"))
        if email:
            emails.add(email)
    return {"emails": emails, "urls": urls}
