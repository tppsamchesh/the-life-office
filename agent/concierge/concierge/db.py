"""Supabase adapter. Thin: SQL-shaped calls only, no business logic here."""
import logging
from datetime import datetime, timezone

from postgrest.exceptions import APIError
from supabase import Client, create_client

from concierge.config import Config
from concierge.state import ConvState
from concierge.timeutil import iso, parse_ts

logger = logging.getLogger(__name__)

_UNIQUE_VIOLATION = "23505"


def _ts(dt: datetime) -> str:
    """Z-suffixed ISO string: unambiguous in PostgREST filter params and column writes."""
    return iso(dt).replace("+00:00", "Z")


def _now_ts() -> str:
    return _ts(datetime.now(timezone.utc))


class ConciergeDB:
    def __init__(self, cfg: Config) -> None:
        self._client: Client = create_client(cfg.supabase_url, cfg.supabase_service_key)

    def resolve_channel(self, channel: str, address: str) -> dict | None:
        res = (self._client.table("client_channels").select("*")
               .eq("channel", channel).eq("address", address).limit(1).execute())
        return res.data[0] if res.data else None

    def primary_address(self, client_id: str, channel: str) -> str | None:
        res = (self._client.table("client_channels").select("address,is_primary")
               .eq("client_id", client_id).eq("channel", channel).execute())
        if not res.data:
            return None
        for row in res.data:
            if row["is_primary"]:
                return row["address"]
        return res.data[0]["address"]

    def get_or_create_conversation(self, client_id: str, channel: str) -> dict:
        res = (self._client.table("conversations").select("*")
               .eq("client_id", client_id).eq("channel", channel).limit(1).execute())
        if res.data:
            return res.data[0]
        try:
            ins = (self._client.table("conversations")
                   .insert({"client_id": client_id, "channel": channel}).execute())
            return ins.data[0]
        except APIError as exc:
            if exc.code == _UNIQUE_VIOLATION:  # lost a race; fetch the winner
                res = (self._client.table("conversations").select("*")
                       .eq("client_id", client_id).eq("channel", channel).limit(1).execute())
                return res.data[0]
            raise

    def get_conversation(self, conversation_id: str) -> dict | None:
        res = (self._client.table("conversations").select("*")
               .eq("id", conversation_id).limit(1).execute())
        return res.data[0] if res.data else None

    def insert_inbound(self, conversation_id: str, body: str, twilio_sid: str) -> bool:
        try:
            (self._client.table("messages").insert({
                "conversation_id": conversation_id, "direction": "inbound",
                "author": "client", "body": body, "twilio_sid": twilio_sid,
                "status": "received",
            }).execute())
            return True
        except APIError as exc:
            if exc.code == _UNIQUE_VIOLATION:
                return False
            raise

    def quarantine(self, channel: str, address: str, body: str, twilio_sid: str) -> None:
        try:
            (self._client.table("quarantined_messages").insert({
                "channel": channel, "address": address, "body": body,
                "twilio_sid": twilio_sid,
            }).execute())
        except APIError as exc:
            if exc.code != _UNIQUE_VIOLATION:
                raise

    def apply_state(self, conversation_id: str, new: ConvState,
                    last_inbound_at: datetime | None = None) -> None:
        patch: dict = {
            "state": new.state,
            "agent_paused": new.agent_paused,
            "grace_deadline": _ts(new.grace_deadline) if new.grace_deadline else None,
            "updated_at": _now_ts(),
        }
        if last_inbound_at is not None:
            patch["last_inbound_at"] = _ts(last_inbound_at)
        self._client.table("conversations").update(patch).eq("id", conversation_id).execute()

    def fetch_expired_graces(self, now: datetime) -> list[dict]:
        res = (self._client.table("conversations").select("*")
               .eq("state", "awaiting_meg").eq("agent_paused", False)
               .lte("grace_deadline", _ts(now)).execute())
        return res.data or []

    def fetch_due_outbound(self, now: datetime, limit: int = 10) -> list[dict]:
        res = (self._client.table("messages").select("*")
               .eq("status", "queued")
               .or_(f"next_attempt_at.is.null,next_attempt_at.lte.{_ts(now)}")
               .order("created_at").limit(limit).execute())
        return res.data or []

    def mark_sending(self, message_id: str) -> None:
        self._client.table("messages").update({"status": "sending"}).eq("id", message_id).execute()

    def mark_sent(self, message_id: str, twilio_sid: str, now: datetime) -> None:
        (self._client.table("messages").update({
            "status": "sent", "twilio_sid": twilio_sid, "sent_at": _ts(now),
        }).eq("id", message_id).execute())

    def record_send_failure(self, message_id: str, error: str, attempts: int,
                            next_attempt_at: datetime | None, terminal: bool) -> None:
        (self._client.table("messages").update({
            "error": error,
            "send_attempts": attempts,
            "next_attempt_at": _ts(next_attempt_at) if next_attempt_at else None,
            "status": "failed" if terminal else "queued",
        }).eq("id", message_id).execute())

    def mark_cancelled(self, message_id: str) -> None:
        self._client.table("messages").update({"status": "cancelled"}).eq("id", message_id).execute()

    def reset_stranded_sending(self) -> int:
        res = (self._client.table("messages").update({"status": "queued"})
               .eq("status", "sending").execute())
        return len(res.data or [])

    def meg_activity_since(self, conversation_id: str, since: str) -> bool:
        res = (self._client.table("messages").select("id")
               .eq("conversation_id", conversation_id).eq("author", "meg")
               .gt("created_at", since).limit(1).execute())
        return bool(res.data)

    def set_delivery_status(self, twilio_sid: str, status: str, now: datetime) -> dict | None:
        patch: dict = {"status": status}
        if status == "delivered":
            patch["delivered_at"] = _ts(now)
        res = (self._client.table("messages").update(patch)
               .eq("twilio_sid", twilio_sid).execute())
        return res.data[0] if res.data else None

    def flag_conversation_for_meg(self, conversation_id: str) -> None:
        (self._client.table("conversations").update({
            "state": "meg_active", "agent_paused": True, "grace_deadline": None,
            "updated_at": _now_ts(),
        }).eq("id", conversation_id).execute())

    def latest_inbound_at(self) -> datetime | None:
        res = (self._client.table("messages").select("created_at")
               .eq("direction", "inbound").order("created_at", desc=True)
               .limit(1).execute())
        return parse_ts(res.data[0]["created_at"]) if res.data else None

    def heartbeat(self, service: str) -> None:
        try:
            (self._client.table("service_heartbeats")
             .upsert({"service": service, "beat_at": _now_ts()}).execute())
        except APIError:
            logger.exception("heartbeat write failed")

    def get_or_create_conversation_for_channel(self, channel_row: dict) -> dict:
        res = (self._client.table("conversations").select("*")
               .eq("client_channel_id", channel_row["id"]).limit(1).execute())
        if res.data:
            return res.data[0]
        try:
            ins = (self._client.table("conversations").insert({
                "client_id": channel_row["client_id"],
                "channel": channel_row["channel"],
                "client_channel_id": channel_row["id"],
            }).execute())
            return ins.data[0]
        except APIError as exc:
            if exc.code == _UNIQUE_VIOLATION:
                res = (self._client.table("conversations").select("*")
                       .eq("client_channel_id", channel_row["id"]).limit(1).execute())
                return res.data[0]
            raise

    def conversation_address(self, conversation: dict) -> str | None:
        channel_id = conversation.get("client_channel_id")
        if channel_id:
            res = (self._client.table("client_channels").select("address")
                   .eq("id", channel_id).limit(1).execute())
            if res.data:
                return res.data[0]["address"]
        return self.primary_address(conversation["client_id"], conversation["channel"])

    def conversation_label(self, conversation: dict) -> str:
        person: str | None = None
        channel_id = conversation.get("client_channel_id")
        if channel_id:
            ch = (self._client.table("client_channels").select("family_member_id")
                  .eq("id", channel_id).limit(1).execute())
            member_id = ch.data[0]["family_member_id"] if ch.data else None
            if member_id:
                fm = (self._client.table("family_members").select("first_name")
                      .eq("id", member_id).limit(1).execute())
                if fm.data:
                    person = fm.data[0]["first_name"]
        cl = (self._client.table("clients").select("first_name,last_name")
              .eq("id", conversation["client_id"]).limit(1).execute())
        first = cl.data[0]["first_name"] if cl.data else "Client"
        last = (cl.data[0].get("last_name") or "") if cl.data else ""
        person = person or first
        return f"{person} ({last})" if last else person
