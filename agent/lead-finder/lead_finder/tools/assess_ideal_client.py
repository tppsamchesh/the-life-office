from __future__ import annotations

_CONFIDENT = {"medium", "high"}


def assess_ideal_client(*, db) -> dict:
    """Read outcomes + learnings and return the profile that steers discovery.

    `db` exposes converted_leads(), rejected_leads(), learnings(). A cold start
    (no data yet) is a valid success with an empty profile — not an error.
    """
    learnings = [
        row["insight"]
        for row in db.learnings()
        if row.get("confidence") in _CONFIDENT and row.get("insight")
    ]
    profile = {
        "converted_count": len(db.converted_leads()),
        "rejected_count": len(db.rejected_leads()),
        "learnings": learnings,
    }
    return {"status": "success", "profile": profile}
