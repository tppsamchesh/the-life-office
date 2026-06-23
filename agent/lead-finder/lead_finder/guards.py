from __future__ import annotations

# The only stage create_lead is ever allowed to write. The human review gate.
NEEDS_REVIEWING = "needs_reviewing"


def build_lead_insert(candidate: dict) -> dict:
    # Hard guard: the agent can surface leads but never advance them. The insert
    # payload always lands at needs_reviewing, whatever the candidate carries.
    row = dict(candidate)
    row["stage"] = NEEDS_REVIEWING
    return row


def normalize_email(value) -> str | None:
    if not value:
        return None
    cleaned = str(value).strip().lower()
    return cleaned or None


def passes_fit_threshold(fit_score, threshold: int) -> bool:
    # Only candidates scored at or above the threshold are surfaced. A missing
    # score is never passed through — no fabricated confidence.
    if fit_score is None:
        return False
    return fit_score >= threshold


def normalize_url(value) -> str | None:
    if not value:
        return None
    cleaned = str(value).strip().lower().rstrip("/")
    return cleaned or None


def is_duplicate(candidate: dict, seen: dict) -> bool:
    # Suppression guard: a candidate is a duplicate if its email OR its source
    # URL is already in the seen index (existing leads + clients).
    email = normalize_email(candidate.get("email"))
    if email and email in seen.get("emails", set()):
        return True
    url = normalize_url(candidate.get("source_url"))
    if url and url in seen.get("urls", set()):
        return True
    return False
