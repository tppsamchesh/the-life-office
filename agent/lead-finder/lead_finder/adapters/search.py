from __future__ import annotations

import json
import urllib.parse
import urllib.request

from lead_finder.hosts import filter_search_hits


def _get_json(url: str, headers: dict, timeout: int = 20):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class WebSearch:
    """web(query) -> firm-site URLs. Brave primary, SerpAPI fallback, junk hosts dropped."""

    def __init__(self, brave_key: str | None = None, serpapi_key: str | None = None, count: int = 8):
        self.brave_key = brave_key
        self.serpapi_key = serpapi_key
        self.count = count

    def _results(self, query: str) -> list[str]:
        urls = []
        if self.brave_key:
            urls = self._brave(query)
        if not urls and self.serpapi_key:
            urls = self._serpapi(query)
        return urls

    def web(self, query: str) -> list[str]:
        # Firm sites only — social/aggregator hosts dropped.
        return filter_search_hits(self._results(query))

    def raw(self, query: str) -> list[str]:
        # Unfiltered — needed for LinkedIn company/person lookups (web() drops linkedin).
        return self._results(query)

    def _brave(self, query: str) -> list[str]:
        qs = urllib.parse.urlencode({"q": query, "count": self.count})
        try:
            data = _get_json(
                f"https://api.search.brave.com/res/v1/web/search?{qs}",
                {"X-Subscription-Token": self.brave_key, "Accept": "application/json"},
            )
        except Exception:  # noqa: BLE001 — fall through to serpapi / empty
            return []
        return [r.get("url") for r in (data.get("web", {}).get("results") or []) if r.get("url")]

    def _serpapi(self, query: str) -> list[str]:
        qs = urllib.parse.urlencode({"engine": "google", "q": query, "api_key": self.serpapi_key})
        try:
            data = _get_json(f"https://serpapi.com/search.json?{qs}", {})
        except Exception:  # noqa: BLE001
            return []
        return [r.get("link") for r in (data.get("organic_results") or []) if r.get("link")]
