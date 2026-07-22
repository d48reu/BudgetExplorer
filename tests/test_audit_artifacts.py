"""Regression checks for the reproducible numeric audit artifacts."""

import csv
import json
from pathlib import Path

from pipeline.audit.generator import _difference, _page_string, _same


ROOT = Path(__file__).parents[1]
EXPECTATIONS = ROOT / "pipeline" / "data" / "official_numeric_expectations.json"
SUMMARY = ROOT / "budget-explorer-web" / "src" / "data" / "budget-audit.json"
LEDGER = ROOT / "budget-explorer-web" / "public" / "audit" / "number-ledger.csv"
PROPOSED = ROOT / "pipeline" / "data" / "fy_2026_27_proposed.json"


def test_audit_numeric_comparison_is_exact() -> None:
    assert _same(100, 100)
    assert not _same(100, 101)
    assert _difference(100, 101) == "1"
    assert _same(None, None)
    assert not _same(None, 0)


def test_page_references_flatten_and_deduplicate() -> None:
    assert _page_string(3, [4, 3], None, (5,)) == "3, 4, 5"


def test_independent_headlines_balance() -> None:
    releases = json.loads(EXPECTATIONS.read_text(encoding="utf-8"))
    for release in releases.values():
        headlines = release["headlines"]
        assert (
            headlines["net_operating_cents"] + headlines["capital_cents"]
            == headlines["total_budget_cents"]
        )
        assert sum(item["amount_cents"] for item in release["revenue"]) == (
            headlines["net_operating_cents"]
        )


def test_proposed_rows_keep_source_pages() -> None:
    data = json.loads(PROPOSED.read_text(encoding="utf-8"))
    for row in data["department_budgets"]:
        if row["operating_cents"] or row["restated_adopted_operating_cents"]:
            assert row["operating_source_page"] is not None
        if row["capital_cents"]:
            assert row["capital_source_page"] is not None


def test_committed_audit_gate_matches_ledger() -> None:
    summary = json.loads(SUMMARY.read_text(encoding="utf-8"))
    with LEDGER.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    assert summary["gate"]["status"] == "PASS"
    assert summary["gate"]["toleranceCents"] == 0
    assert summary["gate"]["exactMonetaryVarianceCents"] == "0"
    assert summary["gate"]["checks"] == len(rows)
    assert all(row["status"] == "PASS" for row in rows)
    assert all(row["source_url"].startswith("https://") for row in rows)
