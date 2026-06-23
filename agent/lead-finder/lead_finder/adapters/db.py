from __future__ import annotations

from datetime import datetime, timezone

from supabase import create_client

# Only these columns may be written to leads (whitelist — drops any stray keys the
# model includes, e.g. contact_emails/evidence, so an insert never errors).
_ALLOWED_LEAD_COLUMNS = {
    "first_name", "last_name", "email", "phone", "source", "source_type",
    "source_url", "lead_type", "fit_score", "ai_summary", "brief", "stage",
    "agent_run_id",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SupabaseDB:
    """Adapter implementing the `db` interface the tools expect, plus run logging."""

    def __init__(self, url: str, service_key: str):
        self._c = create_client(url, service_key)
        self.run_id: str | None = None

    # --- reads used by assess_ideal_client + dedup ---
    def converted_leads(self):
        return self._c.table("leads").select("email,source_url").eq("stage", "converted").execute().data

    def rejected_leads(self):
        return self._c.table("leads").select("id").eq("stage", "rejected").execute().data

    def learnings(self):
        return (
            self._c.table("agent_learnings")
            .select("insight,confidence")
            .eq("agent", "lead_finder")
            .execute()
            .data
        )

    def all_leads(self):
        return self._c.table("leads").select("email,source_url").execute().data

    def all_clients(self):
        return self._c.table("clients").select("email").execute().data

    # --- write used by create_lead ---
    def insert_lead(self, row: dict) -> str:
        clean = {k: v for k, v in row.items() if k in _ALLOWED_LEAD_COLUMNS}
        if self.run_id:
            clean["agent_run_id"] = self.run_id
        data = self._c.table("leads").insert(clean).execute().data
        return data[0]["id"]

    # --- run logging (Principle 7 trace) ---
    def start_run(self, sources_searched) -> str:
        data = (
            self._c.table("agent_runs")
            .insert(
                {
                    "agent_name": "lead_finder",
                    "status": "running",
                    "sources_searched": sources_searched,
                }
            )
            .execute()
            .data
        )
        self.run_id = data[0]["id"]
        return self.run_id

    def log_event(self, seq: int, event_type: str, **fields):
        self._c.table("agent_run_events").insert(
            {"run_id": self.run_id, "seq": seq, "event_type": event_type, **fields}
        ).execute()

    def finish_run(self, status: str, **fields):
        self._c.table("agent_runs").update(
            {"status": status, "finished_at": _now(), **fields}
        ).eq("id", self.run_id).execute()
