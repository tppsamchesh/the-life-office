from __future__ import annotations

# Generic mailboxes — no individual behind them; weakest signal for Meg.
_GENERIC = {
    "info", "hello", "hi", "enquiries", "enquiry", "contact", "admin", "office",
    "mail", "mailbox", "team", "hq", "reception", "accounts", "support", "help",
    "ask", "general", "no-reply", "noreply",
}
# Role mailboxes — a function, not a person, but more useful than generic.
_ROLE = {
    "sales", "newbusiness", "partnerships", "partnership", "partner", "referrals",
    "business", "bd", "marketing", "introductions",
}


def classify_email(addr: str) -> str:
    """personal | role | generic — by the local part of the address."""
    local = addr.split("@", 1)[0].strip().lower()
    if local in _GENERIC:
        return "generic"
    if local in _ROLE:
        return "role"
    return "personal"


_RANK = {"personal": 0, "role": 1, "generic": 2}


def best_email(emails) -> tuple[str, str] | None:
    """Pick the most personal address available; return (addr, type) or None."""
    classified = [(addr, classify_email(addr)) for addr in emails if addr]
    if not classified:
        return None
    classified.sort(key=lambda pair: _RANK[pair[1]])
    return classified[0]
