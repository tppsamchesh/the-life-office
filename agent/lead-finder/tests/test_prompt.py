from lead_finder.prompt import build_system_prompt


def test_build_system_prompt_includes_all_knowledge_and_core_rules(tmp_path):
    for name, body in [
        ("SOUL", "soul-body"),
        ("CONTEXT", "ctx-body"),
        ("USER", "user-body"),
        ("PLAYBOOK", "play-body"),
    ]:
        (tmp_path / f"{name}.md").write_text(body)

    prompt = build_system_prompt(tmp_path)

    # all four knowledge docs are present
    for body in ("soul-body", "ctx-body", "user-body", "play-body"):
        assert body in prompt
    # the non-negotiable rules are stated in the prompt itself
    assert "needs_reviewing" in prompt
    assert "never contact" in prompt.lower()
