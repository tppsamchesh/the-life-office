from __future__ import annotations

from pathlib import Path

from lead_finder.adapters.crawl import HttpCrawl
from lead_finder.adapters.db import SupabaseDB
from lead_finder.adapters.search import WebSearch
from lead_finder.agent import run_loop
from lead_finder.config import load_config
from lead_finder.seen import build_seen_index

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"


def main():
    config = load_config()
    db = SupabaseDB(config.supabase_url, config.supabase_service_key)
    db.start_run(sources_searched=["partner_directory", "published_prospect"])
    try:
        search = WebSearch(config.brave_key, config.serpapi_key)
        crawl = HttpCrawl()
        seen = build_seen_index(db.all_leads(), db.all_clients())
        counts = run_loop(config, db, search, crawl, seen, KNOWLEDGE_DIR)
        db.finish_run(
            "completed",
            candidates_found=counts["candidates_found"],
            leads_written=counts["leads_written"],
            candidates_skipped=counts["candidates_skipped"],
            duplicates_caught=counts["duplicates_caught"],
            token_usage=counts["token_usage"],
        )
        print(f"lead-finder run complete: {counts}")
        return counts
    except Exception as exc:  # noqa: BLE001 — record the failure on the run row, then re-raise
        db.finish_run("failed", error_summary=str(exc))
        raise


if __name__ == "__main__":
    main()
