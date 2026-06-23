from lead_finder.tools.create_lead import create_lead


class FakeDB:
    def __init__(self, *, fail=False):
        self.inserted = []
        self.fail = fail

    def insert_lead(self, row):
        if self.fail:
            raise RuntimeError("db down")
        self.inserted.append(row)
        return "lead-123"


EMPTY_SEEN = {"emails": set(), "urls": set()}


def test_create_lead_success_inserts_at_needs_reviewing_and_returns_id():
    db = FakeDB()
    candidate = {"first_name": "Acme Wealth", "lead_type": "partner", "fit_score": 80}

    result = create_lead(candidate, seen=EMPTY_SEEN, db=db)

    assert result["status"] == "success"
    assert result["lead_id"] == "lead-123"
    assert len(db.inserted) == 1
    assert db.inserted[0]["stage"] == "needs_reviewing"


def test_create_lead_rejects_missing_first_name_without_inserting():
    db = FakeDB()
    result = create_lead({"first_name": "  "}, seen=EMPTY_SEEN, db=db)
    assert result["status"] == "error"
    assert result["type"] == "invalid"
    assert db.inserted == []


def test_create_lead_skips_duplicate_without_inserting():
    db = FakeDB()
    seen = {"emails": {"hi@acme.com"}, "urls": set()}
    result = create_lead({"first_name": "Jo", "email": "hi@acme.com"}, seen=seen, db=db)
    assert result["status"] == "duplicate"
    assert db.inserted == []


def test_create_lead_surfaces_db_failure_as_structured_error():
    db = FakeDB(fail=True)
    result = create_lead({"first_name": "Jo"}, seen=EMPTY_SEEN, db=db)
    assert result["status"] == "error"
    assert result["type"] == "db"
