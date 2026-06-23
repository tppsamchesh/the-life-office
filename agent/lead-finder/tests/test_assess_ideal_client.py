from lead_finder.tools.assess_ideal_client import assess_ideal_client


class FakeDB:
    def __init__(self, converted=None, rejected=None, learnings=None):
        self._converted = converted or []
        self._rejected = rejected or []
        self._learnings = learnings or []

    def converted_leads(self):
        return self._converted

    def rejected_leads(self):
        return self._rejected

    def learnings(self):
        return self._learnings


def test_assess_summarizes_outcomes_and_keeps_only_confident_learnings():
    db = FakeDB(
        converted=[{"id": 1}, {"id": 2}],
        rejected=[{"id": 3}],
        learnings=[
            {"insight": "Surrey wealth managers convert", "confidence": "high"},
            {"insight": "weak hunch", "confidence": "low"},
        ],
    )

    result = assess_ideal_client(db=db)

    assert result["status"] == "success"
    profile = result["profile"]
    assert profile["converted_count"] == 2
    assert profile["rejected_count"] == 1
    assert profile["learnings"] == ["Surrey wealth managers convert"]


def test_assess_cold_start_is_success_with_empty_profile():
    result = assess_ideal_client(db=FakeDB())
    assert result["status"] == "success"
    assert result["profile"] == {"converted_count": 0, "rejected_count": 0, "learnings": []}
