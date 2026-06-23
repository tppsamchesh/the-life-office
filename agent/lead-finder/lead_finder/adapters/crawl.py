from __future__ import annotations

import html
import re
import urllib.request

_SCRIPT_STYLE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")

_UA = "Mozilla/5.0 (compatible; TLO-LeadFinder/1.0; +https://thelifeoffice)"


class HttpCrawl:
    """read(url) -> visible page text. Direct fetch + HTML strip (stdlib only).

    Needs no third-party crawler. If sites block this or render via JS, swap in a
    tpp-crawlee backend behind the same read(url) interface (CRAWLEE_URL in config)."""

    def __init__(self, timeout: int = 20, max_chars: int = 20000):
        self.timeout = timeout
        self.max_chars = max_chars

    def _get(self, url: str) -> str:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            return resp.read().decode("utf-8", errors="ignore")

    def _to_text(self, raw: str) -> str:
        text = _SCRIPT_STYLE.sub(" ", raw)
        text = _TAG.sub(" ", text)
        text = html.unescape(text)
        return _WS.sub(" ", text).strip()[: self.max_chars]

    def read(self, url: str) -> str:
        return self._to_text(self._get(url))

    def fetch(self, url: str) -> dict:
        # Raw HTML (for link-following to team/contact pages) + visible text.
        raw = self._get(url)
        return {"html": raw[:80000], "text": self._to_text(raw)}
