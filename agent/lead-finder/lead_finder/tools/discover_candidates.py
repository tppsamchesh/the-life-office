from __future__ import annotations

from urllib.parse import urlparse

from lead_finder.contacts import best_email
from lead_finder.extract import extract_emails
from lead_finder.linkedin import pick_linkedin
from lead_finder.pages import find_contact_pages

# mode -> (lead_type, source_type)
_MODE = {
    "partner_directory": ("partner", "partner_directory"),
    "published_prospect": ("prospect", "signal"),
}


def _firm_name(url: str) -> str:
    host = (urlparse(url).hostname or url).lower().removeprefix("www.")
    return host.split(".")[0].replace("-", " ")


def discover_candidates(
    mode: str, *, queries, search, crawl, max_pages: int = 3, evidence_chars: int = 4000
) -> dict:
    """Find candidate firms and ENRICH each from free public sources:
    crawl the homepage + its team/about/contact pages for a personal email and a
    named decision-maker, and find the company's LinkedIn via search.

    `search` has web(query)->[urls] and raw(query)->[urls] (unfiltered, for LinkedIn).
    `crawl` has fetch(url)->{"text","html"}. Returns status + enriched candidates.
    """
    lead_type, source_type = _MODE[mode]
    candidates = []
    seen = set()

    for query in queries:
        for url in search.web(query):
            if url in seen:
                continue
            seen.add(url)
            try:
                home = crawl.fetch(url)
            except Exception:  # noqa: BLE001 — a blocked homepage skips the firm
                continue

            emails = list(extract_emails(home.get("text", "")))
            evidence = home.get("text", "")
            for page in find_contact_pages(url, home.get("html", ""))[:max_pages]:
                try:
                    pg = crawl.fetch(page)
                except Exception:  # noqa: BLE001 — skip a blocked sub-page
                    continue
                emails += extract_emails(pg.get("text", ""))
                evidence += " " + pg.get("text", "")

            unique = list(dict.fromkeys(emails))
            best = best_email(unique)
            company_linkedin = None
            if hasattr(search, "raw"):
                firm = _firm_name(url)
                company_linkedin = pick_linkedin(
                    search.raw(f'site:linkedin.com/company "{firm}"'), "company", match=firm
                )

            candidates.append(
                {
                    "source_url": url,
                    "source_type": source_type,
                    "lead_type": lead_type,
                    "contact_emails": unique,
                    "best_email": best[0] if best else None,
                    "best_email_type": best[1] if best else None,
                    "company_linkedin": company_linkedin,
                    "evidence": evidence[:evidence_chars],
                }
            )

    return {"status": "success" if candidates else "no_results", "candidates": candidates}
