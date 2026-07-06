"""Web push to Meg's subscribed devices. Never blocks or raises into callers."""
import json
import logging

from pywebpush import WebPushException, webpush

logger = logging.getLogger(__name__)

_PREVIEW_LIMIT = 120


class Pusher:
    def __init__(self, db, private_key: str, subject: str) -> None:
        self._db = db
        self._key = private_key
        self._subject = subject

    @property
    def enabled(self) -> bool:
        return bool(self._key)

    def _send_all(self, payload: dict) -> int:
        if not self.enabled:
            return 0
        sent = 0
        body = json.dumps(payload)
        subscriptions = []
        try:
            subscriptions = self._db.list_push_subscriptions()
        except Exception:
            logger.exception("failed to fetch push subscriptions")
            return 0
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                    },
                    data=body,
                    vapid_private_key=self._key,
                    vapid_claims={"sub": self._subject},
                )
                sent += 1
            except WebPushException as exc:
                status = getattr(getattr(exc, "response", None), "status_code", None)
                if status in (404, 410):
                    try:
                        self._db.delete_push_subscription(sub["endpoint"])
                        logger.info("removed dead push subscription")
                    except Exception:
                        logger.exception("failed to remove dead push subscription")
                else:
                    logger.warning("push delivery failed: %s", exc)
            except Exception:
                logger.exception("unexpected push failure")
        return sent

    def notify_inbound(self, conversation: dict, body: str) -> None:
        try:
            preview = body if len(body) <= _PREVIEW_LIMIT else body[:_PREVIEW_LIMIT - 3] + "..."
            self._send_all({
                "title": self._db.conversation_label(conversation),
                "body": preview,
                "url": f"/dashboard/conversations?conversation={conversation['id']}",
            })
        except Exception:
            logger.exception("failed to send inbound push notification")

    def notify_send_failure(self, conversation: dict) -> None:
        try:
            label = self._db.conversation_label(conversation)
            self._send_all({
                "title": "Delivery problem",
                "body": f"A message to {label} couldn't be delivered",
                "url": f"/dashboard/conversations?conversation={conversation['id']}",
            })
        except Exception:
            logger.exception("failed to send send-failure push notification")
