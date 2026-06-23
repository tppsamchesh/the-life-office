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
            "Find candidate firms and ENRICH each from free public pages. Use "
            "mode='partner_directory' for referral partners (wealth managers/IFAs, EA/VA "
            "agencies, maternity & nanny concierges) — primary. Use mode='published_prospect' "
            "for individual prospects whose site publishes a contact. Give focused `queries` "
            "(e.g. 'wealth managers Surrey'). For each firm it crawls the homepage + its "
            "team/about/contact pages and returns: contact_emails, best_email + best_email_type "
            "(personal | role | generic), company_linkedin, and page `evidence` text. Read the "
            "evidence to name a real decision-maker (name + role); prefer a personal email over a "
            "generic info@ one. It does NOT judge fit or enrich paid data — you judge fit."
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
        "name": "lookup_person",
        "description": (
            "Find a named decision-maker's public LinkedIn profile via search. Call this once "
            "you've identified a specific person at a firm (from discover_candidates evidence), "
            "to give Meg a real human to verify and reach. Returns the LinkedIn URL or no_results. "
            "Never crawls LinkedIn — it only finds the public profile URL."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "The person's full name."},
                "firm": {"type": "string", "description": "Their company, to disambiguate."},
            },
            "required": ["name", "firm"],
        },
    },
    {
        "name": "create_lead",
        "description": (
            "Surface ONE qualified candidate to Meg as a lead at needs_reviewing. Prefer a NAMED "
            "decision-maker over a faceless firm: put the person in first_name/last_name and their "
            "role, LinkedIn, the company LinkedIn and the email type in `brief`. Use a personal "
            "email when found; a generic info@ alone is weak — still surface it but say so in "
            "ai_summary. Put a 2-line 'why' AND the reasoning behind the fit score in ai_summary "
            "(all Meg sees). Do NOT write an outreach draft. The tool dedupes and is hard-locked "
            "to needs_reviewing; it returns success/duplicate/skipped/blocked/error."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string", "description": "Decision-maker's first name, or the firm name if no person found."},
                "last_name": {"type": "string"},
                "email": {"type": "string", "description": "Best published email (prefer personal)."},
                "phone": {"type": "string"},
                "lead_type": {"type": "string", "enum": ["prospect", "partner"]},
                "source_type": {"type": "string", "enum": ["partner_directory", "signal", "reddit"]},
                "source_url": {"type": "string", "description": "The firm's website."},
                "fit_score": {"type": "integer", "description": "0-100 fit against CONTEXT."},
                "ai_summary": {"type": "string", "description": "2-line why + why scored that way."},
                "brief": {
                    "type": "object",
                    "description": (
                        "Structured detail for Meg: { role, firm, person_linkedin, "
                        "company_linkedin, email_type, signals }."
                    ),
                },
            },
            "required": ["first_name", "lead_type", "source_type", "fit_score", "ai_summary"],
        },
    },
]
