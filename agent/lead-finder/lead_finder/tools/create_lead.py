from __future__ import annotations

from lead_finder.guards import build_lead_insert, is_duplicate


def create_lead(candidate: dict, *, seen: dict, db) -> dict:
    """Insert a candidate as a lead at needs_reviewing.

    Returns a structured status (Principle 3): success | duplicate | error.
    `db` is any object with insert_lead(row) -> lead_id (injected for testing).
    """
    first = (candidate.get("first_name") or "").strip()
    if not first:
        return {"status": "error", "type": "invalid", "message": "first_name is required"}

    if is_duplicate(candidate, seen):
        return {"status": "duplicate", "message": "already in leads or clients"}

    row = build_lead_insert(candidate)
    try:
        lead_id = db.insert_lead(row)
    except Exception as exc:  # noqa: BLE001 — surface any db failure as structured error
        return {"status": "error", "type": "db", "message": str(exc)}

    return {"status": "success", "lead_id": lead_id}
