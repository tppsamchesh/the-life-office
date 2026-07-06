from datetime import datetime, timezone

from concierge.timeutil import iso, parse_ts


def test_parse_ts_none_returns_none():
    assert parse_ts(None) is None


def test_parse_ts_datetime_passthrough():
    dt = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)
    assert parse_ts(dt) == dt


def test_parse_ts_iso_string():
    dt = parse_ts("2026-07-06T12:00:00+00:00")
    assert dt == datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)


def test_parse_ts_supabase_z_suffix():
    dt = parse_ts("2026-07-06T12:00:00Z")
    assert dt == datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)


def test_iso_round_trip():
    dt = datetime(2026, 7, 6, 12, 30, 15, tzinfo=timezone.utc)
    assert parse_ts(iso(dt)) == dt
