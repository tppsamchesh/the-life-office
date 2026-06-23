from __future__ import annotations

import os
from dataclasses import dataclass


def _first(*names, required=True, default=None):
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    if required:
        raise RuntimeError(f"Missing required env var (one of): {', '.join(names)}")
    return default


@dataclass
class Config:
    anthropic_key: str
    model: str
    supabase_url: str
    supabase_service_key: str
    brave_key: str | None
    serpapi_key: str | None
    crawlee_url: str | None
    crawlee_key: str | None
    max_iterations: int
    per_run_lead_cap: int
    fit_threshold: int


def load_config() -> Config:
    return Config(
        anthropic_key=_first("ANTHROPIC_API_KEY", "ANTHROPIC_KEY"),
        # Judgement quality matters most; tiering down to Haiku is a later refinement.
        model=os.environ.get("LEAD_FINDER_MODEL", "claude-sonnet-4-6"),
        # SETUP GAP: the TLO Dashboard service-role key must be added to the VPS secrets
        # manager (it is not there yet) and exported as LEAD_FINDER_SUPABASE_SERVICE_KEY.
        supabase_url=_first("LEAD_FINDER_SUPABASE_URL", "TLO_SUPABASE_URL"),
        supabase_service_key=_first("LEAD_FINDER_SUPABASE_SERVICE_KEY", "TLO_SUPABASE_SERVICE_KEY"),
        brave_key=_first("BRAVE_KEY", "BRAVE_API_KEY", required=False),
        serpapi_key=_first("SERPAPI_KEY", required=False),
        # tpp-crawlee endpoint: confirm the real URL/contract; until then the http backend
        # (direct fetch) is used, which needs neither.
        crawlee_url=os.environ.get("CRAWLEE_URL"),
        crawlee_key=_first("CRAWLEE_API_KEY", required=False),
        max_iterations=int(os.environ.get("LEAD_FINDER_MAX_ITERATIONS", "40")),
        per_run_lead_cap=int(os.environ.get("LEAD_FINDER_LEAD_CAP", "15")),
        fit_threshold=int(os.environ.get("LEAD_FINDER_FIT_THRESHOLD", "60")),
    )
