from types import SimpleNamespace

from pywebpush import WebPushException

import concierge.push as push_module
from concierge.push import Pusher
from tests.fakes import FakeDB


def make_db_with_conv() -> tuple[FakeDB, dict]:
    db = FakeDB()
    db.add_client("client-1", first_name="Sarah", last_name="Henderson")
    ch = db.add_channel("client-1", "whatsapp", "+447700900123", is_primary=True)
    conv = db.get_or_create_conversation_for_channel(ch)
    return db, conv


def test_disabled_pusher_sends_nothing(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(push_module, "webpush", lambda **kw: calls.append(kw))
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")
    p = Pusher(db, private_key="", subject="mailto:x@y.z")
    assert p.enabled is False
    p.notify_inbound(conv, "hello")
    assert calls == []


def test_notify_inbound_sends_label_preview_and_url(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(push_module, "webpush", lambda **kw: calls.append(kw))
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")
    Pusher(db, "key", "mailto:x@y.z").notify_inbound(conv, "Can you look at flights?")
    assert len(calls) == 1
    import json
    payload = json.loads(calls[0]["data"])
    assert payload["title"] == "Sarah (Henderson)"
    assert payload["body"] == "Can you look at flights?"
    assert payload["url"] == f"/dashboard/conversations?conversation={conv['id']}"


def test_long_bodies_are_truncated(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(push_module, "webpush", lambda **kw: calls.append(kw))
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")
    Pusher(db, "key", "mailto:x@y.z").notify_inbound(conv, "x" * 300)
    import json
    body = json.loads(calls[0]["data"])["body"]
    assert len(body) == 120 and body.endswith("...")


def test_gone_subscription_is_deleted(monkeypatch):
    def gone(**kw):
        raise WebPushException("gone", response=SimpleNamespace(status_code=410))
    monkeypatch.setattr(push_module, "webpush", gone)
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/dead")
    Pusher(db, "key", "mailto:x@y.z").notify_inbound(conv, "hi")
    assert db.push_subscriptions == []


def test_other_push_errors_never_raise(monkeypatch):
    def boom(**kw):
        raise WebPushException("server error", response=SimpleNamespace(status_code=500))
    monkeypatch.setattr(push_module, "webpush", boom)
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")
    Pusher(db, "key", "mailto:x@y.z").notify_send_failure(conv)  # must not raise
    assert len(db.push_subscriptions) == 1


def test_label_failure_never_raises(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(push_module, "webpush", lambda **kw: calls.append(kw))
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/abc")

    def boom(conversation):
        raise RuntimeError("db down")

    monkeypatch.setattr(db, "conversation_label", boom)
    p = Pusher(db, "key", "mailto:x@y.z")
    p.notify_inbound(conv, "hi")        # must not raise
    p.notify_send_failure(conv)         # must not raise


def test_subscription_list_failure_never_raises(monkeypatch):
    monkeypatch.setattr(push_module, "webpush", lambda **kw: None)
    db, conv = make_db_with_conv()

    def boom():
        raise RuntimeError("db down")

    monkeypatch.setattr(db, "list_push_subscriptions", boom)
    Pusher(db, "key", "mailto:x@y.z").notify_inbound(conv, "hi")  # must not raise


def test_prune_failure_never_raises(monkeypatch):
    from types import SimpleNamespace
    from pywebpush import WebPushException

    def gone(**kw):
        raise WebPushException("gone", response=SimpleNamespace(status_code=410))
    monkeypatch.setattr(push_module, "webpush", gone)
    db, conv = make_db_with_conv()
    db.add_push_subscription("https://push.example/dead")

    def boom(endpoint):
        raise RuntimeError("db down")

    monkeypatch.setattr(db, "delete_push_subscription", boom)
    Pusher(db, "key", "mailto:x@y.z").notify_inbound(conv, "hi")  # must not raise
