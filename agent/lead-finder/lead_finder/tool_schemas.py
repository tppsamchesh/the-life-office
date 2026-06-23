from __future__ import annotations

# Claude tool definitions for the loop. Descriptions are load-bearing (Principle 2):
# they tell the model exactly when to use each tool and what it returns.

TOOLS = [
    {
        "name": "assess_ideal_client",
        "description": (
            "Read The Life Office's current ideal-client/partner profile from past outcomes "
            "and confirmed learnings. Call this FIRST, once, at the start of a run to ground "
            "your judgement. Returns counts of converted/rejected leads and the high-confidence "
            "learnings to weight. Takes no input."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "discover_candidates",
        "description": (
            "Search the web and read candidate pages for a PUBLISHED contact. Use "
            "mode='partner_directory' to find referral partners (wealth managers/IFAs, EA/VA "
            "agencies, maternity & nanny concierges) — primary. Use mode='published_prospect' "
            "for individual prospects whose company site lists a contact email. Provide focused "
            "`queries` (e.g. 'wealth managers Surrey', 'nanny agency Berkshire'). Returns "
            "candidates with source_url, any published contact_emails, and page evidence. It does "
            "NOT judge fit or enrich — you judge fit from the evidence. No paid enrichment exists."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["partner_directory", "published_prospect"]},
                "queries": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["mode", "queries"],
        },
    },
    {
        "name": "create_lead",
        "description": (
            "Surface ONE qualified candidate to Meg as a lead at needs_reviewing. Only call for "
            "candidates that clear the fit bar. Put a 2-line 'why' AND the reasoning behind the "
            "fit score in ai_summary (this is all Meg sees). Do NOT write an outreach draft. The "
            "tool dedupes and is hard-locked to needs_reviewing; it returns success/duplicate/"
            "skipped/blocked/error."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string", "description": "Contact person, or the firm name for a partner."},
                "last_name": {"type": "string"},
                "email": {"type": "string", "description": "Published email if found, else omit."},
                "phone": {"type": "string"},
                "lead_type": {"type": "string", "enum": ["prospect", "partner"]},
                "source_type": {"type": "string", "enum": ["partner_directory", "signal", "reddit"]},
                "source_url": {"type": "string"},
                "fit_score": {"type": "integer", "description": "0-100 fit against CONTEXT."},
                "ai_summary": {"type": "string", "description": "2-line why + why scored that way."},
                "brief": {"type": "object", "description": "Structured evidence/signals (optional)."},
            },
            "required": ["first_name", "lead_type", "source_type", "fit_score", "ai_summary"],
        },
    },
]
