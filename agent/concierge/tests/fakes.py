"""In-memory doubles matching ConciergeDB and TwilioGateway signatures exactly."""
import itertools
from datetime import datetime, timezone

from concierge.channels import InboundMessage
from concierge.state import ConvState
from concierge.timeutil import iso, parse_ts

_ids = itertools.count(1)


def _next_id(prefix: str) -> str:
    return f"{prefix}-{next(_ids)}"


def _now_iso() -> str:
    return iso(datetime.now(timezone.utc))


class FakeDB:
    def __init__(self) -> None:
        self.clients: dict[str, dict] = {}
        self.channels: list[dict] = []
        self.conversations: dict[str, dict] = {}
        self.messages: dict[str, dict] = {}
        self.quarantined: list[dict] = []
        self.heartbeats: dict[str, str] = {}
        self.family_members: dict[str, dict] = {}

    # test-setup conveniences (not on ConciergeDB)
    def add_client(self, client_id: str, first_name: str = "Client", last_name: str = "") -> None:
        self.clients[client_id] = {
            "id": client_id, "first_name": first_name, "last_name": last_name,
        }

    def add_family_member(self, member_id: str, client_id: str, first_name: str) -> dict:
        row = {"id": member_id, "client_id": client_id, "first_name": first_name}
        self.family_members[member_id] = row
        return dict(row)

    def add_channel(self, client_id: str, channel: str, address: str,
                    is_primary: bool = False, family_member_id: str | None = None) -> dict:
        row = {
            "id": _next_id("ch"), "client_id": client_id, "channel": channel,
            "address": address, "is_primary": is_primary,
            "family_member_id": family_member_id,
        }
        self.channels.append(row)
        return dict(row)

    def queue_outbound(self, conversation_id: str, author: str, body: str,
                       created_at: datetime | None = None) -> str:
        mid = _next_id("msg")
        self.messages[mid] = {
            "id": mid, "conversation_id": conversation_id, "direction": "outbound",
            "author": author, "body": body, "twilio_sid": None, "status": "queued",
            "error": None, "send_attempts": 0, "next_attempt_at": None,
            "created_at": iso(created_at) if created_at else _now_iso(),
            "sent_at": None, "delivered_at": None,
        }
        return mid

    def get_message(self, message_id: str) -> dict | None:
        return self.messages.get(message_id)

    # ConciergeDB contract
    def resolve_channel(self, channel: str, address: str) -> dict | None:
        for ch in self.channels:
            if ch["channel"] == channel and ch["address"] == address:
                return dict(ch)
        return None

    def primary_address(self, client_id: str, channel: str) -> str | None:
        rows = [c for c in self.channels if c["client_id"] == client_id and c["channel"] == channel]
        for c in rows:
            if c["is_primary"]:
                return c["address"]
        return rows[0]["address"] if rows else None

    def get_or_create_conversation(self, client_id: str, channel: str) -> dict:
        for conv in self.conversations.values():
            if conv["client_id"] == client_id and conv["channel"] == channel:
                return dict(conv)
        cid = _next_id("conv")
        conv = {
            "id": cid, "client_id": client_id, "channel": channel, "client_channel_id": None,
            "state": "idle", "agent_paused": False, "grace_deadline": None, "grace_seconds": 240,
            "rolling_summary": None, "last_inbound_at": None,
            "created_at": _now_iso(), "updated_at": _now_iso(),
        }
        self.conversations[cid] = conv
        return dict(conv)

    def get_conversation(self, conversation_id: str) -> dict | None:
        conv = self.conversations.get(conversation_id)
        return dict(conv) if conv else None

    def insert_inbound(self, conversation_id: str, body: str, twilio_sid: str,
                       created_at: datetime | None = None) -> bool:
        if any(m["twilio_sid"] == twilio_sid for m in self.messages.values()):
            return False
        mid = _next_id("msg")
        self.messages[mid] = {
            "id": mid, "conversation_id": conversation_id, "direction": "inbound",
            "author": "client", "body": body, "twilio_sid": twilio_sid,
            "status": "received", "error": None, "send_attempts": 0,
            "next_attempt_at": None,
            "created_at": iso(created_at) if created_at else _now_iso(),
            "sent_at": None, "delivered_at": None,
        }
        return True

    def quarantine(self, channel: str, address: str, body: str, twilio_sid: str) -> None:
        if any(q["twilio_sid"] == twilio_sid for q in self.quarantined):
            return
        self.quarantined.append(
            {"id": _next_id("q"), "channel": channel, "address": address,
             "body": body, "twilio_sid": twilio_sid, "received_at": _now_iso(),
             "claimed_client_id": None}
        )

    def apply_state(self, conversation_id: str, new: ConvState,
                    last_inbound_at: datetime | None = None) -> None:
        conv = self.conversations[conversation_id]
        conv["state"] = new.state
        conv["agent_paused"] = new.agent_paused
        conv["grace_deadline"] = iso(new.grace_deadline) if new.grace_deadline else None
        conv["updated_at"] = _now_iso()
        if last_inbound_at is not None:
            conv["last_inbound_at"] = iso(last_inbound_at)

    def fetch_expired_graces(self, now: datetime) -> list[dict]:
        out = []
        for conv in self.conversations.values():
            deadline = parse_ts(conv["grace_deadline"])
            if (conv["state"] == "awaiting_meg" and not conv["agent_paused"]
                    and deadline is not None and deadline <= now):
                out.append(dict(conv))
        return out

    def fetch_due_outbound(self, now: datetime, limit: int = 10) -> list[dict]:
        due = []
        for m in self.messages.values():
            if m["status"] != "queued":
                continue
            next_at = parse_ts(m["next_attempt_at"])
            if next_at is not None and next_at > now:
                continue
            due.append(dict(m))
        due.sort(key=lambda m: m["created_at"])
        return due[:limit]

    def mark_sending(self, message_id: str) -> None:
        self.messages[message_id]["status"] = "sending"

    def mark_sent(self, message_id: str, twilio_sid: str, now: datetime) -> None:
        m = self.messages[message_id]
        m["status"] = "sent"
        m["twilio_sid"] = twilio_sid
        m["sent_at"] = iso(now)

    def record_send_failure(self, message_id: str, error: str, attempts: int,
                            next_attempt_at: datetime | None, terminal: bool) -> None:
        m = self.messages[message_id]
        m["error"] = error
        m["send_attempts"] = attempts
        m["next_attempt_at"] = iso(next_attempt_at) if next_attempt_at else None
        m["status"] = "failed" if terminal else "queued"

    def mark_cancelled(self, message_id: str) -> None:
        self.messages[message_id]["status"] = "cancelled"

    def reset_stranded_sending(self) -> int:
        count = 0
        for m in self.messages.values():
            if m["status"] == "sending":
                m["status"] = "queued"
                count += 1
        return count

    def meg_activity_since(self, conversation_id: str, since: str) -> bool:
        cutoff = parse_ts(since)
        for m in self.messages.values():
            if (m["conversation_id"] == conversation_id and m["author"] == "meg"
                    and parse_ts(m["created_at"]) > cutoff):
                return True
        return False

    def set_delivery_status(self, twilio_sid: str, status: str, now: datetime) -> dict | None:
        for m in self.messages.values():
            if m["twilio_sid"] == twilio_sid:
                m["status"] = status
                if status == "delivered":
                    m["delivered_at"] = iso(now)
                return dict(m)
        return None

    def flag_conversation_for_meg(self, conversation_id: str) -> None:
        conv = self.conversations[conversation_id]
        conv["state"] = "meg_active"
        conv["agent_paused"] = True
        conv["grace_deadline"] = None
        conv["updated_at"] = _now_iso()

    def latest_inbound_at(self) -> datetime | None:
        times = [parse_ts(m["created_at"]) for m in self.messages.values()
                 if m["direction"] == "inbound"]
        return max(times) if times else None

    def heartbeat(self, service: str) -> None:
        self.heartbeats[service] = _now_iso()

    def get_or_create_conversation_for_channel(self, channel_row: dict) -> dict:
        for conv in self.conversations.values():
            if conv.get("client_channel_id") == channel_row["id"]:
                return dict(conv)
        cid = _next_id("conv")
        conv = {
            "id": cid, "client_id": channel_row["client_id"],
            "channel": channel_row["channel"], "client_channel_id": channel_row["id"],
            "state": "idle", "agent_paused": False, "grace_deadline": None,
            "grace_seconds": 240, "rolling_summary": None, "last_inbound_at": None,
            "created_at": _now_iso(), "updated_at": _now_iso(),
        }
        self.conversations[cid] = conv
        return dict(conv)

    def conversation_address(self, conversation: dict) -> str | None:
        channel_id = conversation.get("client_channel_id")
        if channel_id:
            for ch in self.channels:
                if ch["id"] == channel_id:
                    return ch["address"]
        return self.primary_address(conversation["client_id"], conversation["channel"])

    def conversation_label(self, conversation: dict) -> str:
        person: str | None = None
        channel_id = conversation.get("client_channel_id")
        if channel_id:
            for ch in self.channels:
                if ch["id"] == channel_id and ch.get("family_member_id"):
                    member = self.family_members.get(ch["family_member_id"])
                    if member:
                        person = member["first_name"]
        client = self.clients.get(conversation["client_id"], {})
        first = client.get("first_name", "Client")
        last = client.get("last_name", "")
        person = person or first
        return f"{person} ({last})" if last else person


class FakeGateway:
    def __init__(self, valid_signature: bool = True) -> None:
        self.valid_signature = valid_signature
        self.sent: list[dict] = []
        self.fail_next = 0
        self.inbound_history: list[InboundMessage] = []

    def send(self, channel: str, to_address: str, body: str, status_callback: str) -> str:
        if self.fail_next > 0:
            self.fail_next -= 1
            raise RuntimeError("twilio down")
        sid = f"SM{len(self.sent) + 1:04d}"
        self.sent.append({"channel": channel, "to_address": to_address,
                          "body": body, "status_callback": status_callback, "sid": sid})
        return sid

    def validate_signature(self, url: str, params: dict, signature: str) -> bool:
        return self.valid_signature

    def list_recent_inbound(self, since: datetime) -> list[InboundMessage]:
        return list(self.inbound_history)
