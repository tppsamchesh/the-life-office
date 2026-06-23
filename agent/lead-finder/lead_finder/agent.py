from __future__ import annotations

import json

from anthropic import Anthropic

from lead_finder.guards import normalize_email, normalize_url, passes_fit_threshold
from lead_finder.prompt import build_system_prompt
from lead_finder.tool_schemas import TOOLS
from lead_finder.tools.assess_ideal_client import assess_ideal_client
from lead_finder.tools.create_lead import create_lead
from lead_finder.tools.discover_candidates import discover_candidates

KICKOFF = (
    "Run one discovery session for The Life Office.\n"
    "1. Call assess_ideal_client first to load the profile and learnings.\n"
    "2. Use discover_candidates in partner_directory mode to find referral partners "
    "(wealth managers/IFAs, then EA/VA agencies, then maternity & nanny concierges) in the "
    "target UK areas; you may also use published_prospect mode for individuals.\n"
    "3. Judge each candidate's fit 0-100 from the evidence and CONTEXT. Skip weak ones.\n"
    "4. For each good candidate, call create_lead at needs_reviewing with a 2-line why and the "
    "scoring reasoning in ai_summary. Surface up to {cap} leads.\n"
    "When you've surfaced the best available leads or run dry, stop and give a one-line summary."
)


def run_loop(config, db, search, crawl, seen, knowledge_dir) -> dict:
    # Extra retries ride out transient 500/529 (overloaded) blips on the API.
    client = Anthropic(api_key=config.anthropic_key, max_retries=5)
    system = build_system_prompt(knowledge_dir)
    messages = [{"role": "user", "content": KICKOFF.format(cap=config.per_run_lead_cap)}]
    counts = {
        "candidates_found": 0,
        "leads_written": 0,
        "candidates_skipped": 0,
        "duplicates_caught": 0,
    }
    seq = 0
    in_tok = out_tok = 0

    for _ in range(config.max_iterations):
        resp = client.messages.create(
            model=config.model, max_tokens=4096, system=system, tools=TOOLS, messages=messages
        )
        in_tok += resp.usage.input_tokens
        out_tok += resp.usage.output_tokens

        # Termination is driven by the API signal, never by parsing assistant text.
        if resp.stop_reason != "tool_use":
            break

        messages.append({"role": "assistant", "content": resp.content})
        results = []
        for block in resp.content:
            if getattr(block, "type", None) != "tool_use":
                continue
            seq += 1
            out = _dispatch(block.name, block.input, config, db, search, crawl, seen, counts)
            try:
                db.log_event(
                    seq, "tool_call", tool_name=block.name,
                    tool_status=out.get("status"), payload={"input": block.input},
                )
            except Exception:  # noqa: BLE001 — logging must never break the loop
                pass
            results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(out)}
            )
        messages.append({"role": "user", "content": results})

    counts["token_usage"] = {"input": in_tok, "output": out_tok}
    return counts


def _dispatch(name, args, config, db, search, crawl, seen, counts) -> dict:
    if name == "assess_ideal_client":
        return assess_ideal_client(db=db)

    if name == "discover_candidates":
        out = discover_candidates(
            args["mode"], queries=args.get("queries", []), search=search, crawl=crawl
        )
        counts["candidates_found"] += len(out.get("candidates", []))
        return out

    if name == "create_lead":
        # Guards (Principle 4): fit gate + per-run cap, enforced in code not prompt.
        if not passes_fit_threshold(args.get("fit_score"), config.fit_threshold):
            counts["candidates_skipped"] += 1
            return {"status": "skipped", "reason": f"fit_score below {config.fit_threshold}"}
        if counts["leads_written"] >= config.per_run_lead_cap:
            return {"status": "blocked", "reason": "per-run lead cap reached"}
        out = create_lead(args, seen=seen, db=db)
        if out.get("status") == "success":
            counts["leads_written"] += 1
            email = normalize_email(args.get("email"))
            url = normalize_url(args.get("source_url"))
            if email:
                seen["emails"].add(email)
            if url:
                seen["urls"].add(url)
        elif out.get("status") == "duplicate":
            counts["duplicates_caught"] += 1
        return out

    return {"status": "error", "type": "unknown_tool", "message": name}
