"""Unit checks for source-watch discovery and status logic; no network calls."""

from unittest.mock import Mock

from pipeline.source_watch import check_for_new_publications, matching_publication_links


def test_matching_publication_links_finds_new_budget_material() -> None:
    html = """
    <a href="/ordinary.pdf">Volume 1</a>
    <a href="/second-changes.pdf">Second Changes Memorandum</a>
    <a href="/resources/budget/adopted/fy2026-27/budget-in-brief.pdf">Budget in Brief</a>
    """
    matches = matching_publication_links(
        html,
        ["second changes memorandum", "fy 2026-27 adopted budget"],
        ["/resources/budget/adopted/fy2026-27/"],
    )
    assert matches == [
        ("/second-changes.pdf", "Second Changes Memorandum"),
        (
            "/resources/budget/adopted/fy2026-27/budget-in-brief.pdf",
            "Budget in Brief",
        ),
    ]


def test_matching_publication_links_ignores_unrelated_links() -> None:
    html = '<a href="/fy-2025-26.pdf">Prior adopted budget</a>'
    assert not matching_publication_links(
        html,
        ["second changes memorandum"],
        ["/resources/budget/adopted/fy2026-27/"],
    )


def test_candidate_status_other_than_not_found_requires_attention() -> None:
    response = Mock(status_code=403)
    response.close = Mock()
    session = Mock()
    session.get.return_value = response
    monitor = {
        "directCandidates": ["https://example.gov/adopted.pdf"],
        "discoveryPages": [],
        "linkTextSignals": [],
        "hrefSignals": [],
    }

    checks = check_for_new_publications(session, monitor, set())

    assert checks[0].status == "attention"
    assert "could not be confirmed" in checks[0].detail
