from lead_finder.guards import build_lead_insert, is_duplicate, passes_fit_threshold


def test_build_lead_insert_forces_needs_reviewing_stage():
    # Even if a candidate (or a confused model) supplies a later stage,
    # the insert payload must always land at needs_reviewing.
    candidate = {"first_name": "Jane", "lead_type": "partner", "stage": "converted"}
    row = build_lead_insert(candidate)
    assert row["stage"] == "needs_reviewing"


def test_is_duplicate_matches_email_case_and_whitespace_insensitively():
    seen = {"emails": {"jane@acme.com"}, "urls": set()}
    assert is_duplicate({"email": "  Jane@Acme.com "}, seen) is True


def test_is_duplicate_false_for_unseen_email():
    seen = {"emails": {"jane@acme.com"}, "urls": set()}
    assert is_duplicate({"email": "someone@else.com"}, seen) is False


def test_is_duplicate_matches_source_url_ignoring_trailing_slash():
    seen = {"emails": set(), "urls": {"https://acme.com/team"}}
    assert is_duplicate({"source_url": "https://acme.com/team/"}, seen) is True


def test_passes_fit_threshold_at_or_above_threshold():
    assert passes_fit_threshold(60, threshold=60) is True
    assert passes_fit_threshold(85, threshold=60) is True


def test_below_threshold_is_skipped():
    assert passes_fit_threshold(40, threshold=60) is False


def test_missing_fit_score_is_skipped_never_passed():
    assert passes_fit_threshold(None, threshold=60) is False
