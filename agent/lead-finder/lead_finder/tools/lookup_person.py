from __future__ import annotations

from lead_finder.linkedin import pick_linkedin


def lookup_person(name: str, firm: str, *, search) -> dict:
    """Find a named person's public LinkedIn profile via search (never crawls LinkedIn).
    Returns success | no_results | error."""
    if not name or not name.strip():
        return {"status": "error", "type": "invalid", "message": "name required"}
    results = search.raw(f'site:linkedin.com/in "{name}" {firm}')
    url = pick_linkedin(results, "person", match=name)
    if url:
        return {"status": "success", "linkedin_url": url}
    return {"status": "no_results", "linkedin_url": None}
