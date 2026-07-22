"""Regression checks for the generated FY 2026-27 proposed release."""

import json
from pathlib import Path


DATA_PATH = (
    Path(__file__).parents[1] / "pipeline" / "data" / "fy_2026_27_proposed.json"
)


def _dataset() -> dict:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def test_proposed_release_reconciles_gross_and_net_operating() -> None:
    data = _dataset()
    release = data["release"]

    assert data["format"] == "proposed-budget-v1"
    assert data["fiscal_year"] == "FY 2026-27"
    assert data["stage"] == "proposed"
    assert release["gross_operating_cents"] - release["interagency_transfers_cents"] == (
        release["operating_cents"]
    )
    assert release["operating_cents"] + release["capital_cents"] == release["total_cents"]
    assert all(
        value.startswith("https://www.miamidade.gov/")
        for key, value in release.items()
        if key.endswith("_url")
    )


def test_proposed_priority_totals_match_release() -> None:
    data = _dataset()
    release = data["release"]
    priorities = data["priorities"]

    assert len(priorities) == 7
    assert sum(item["cents_per_dollar"] for item in priorities) == 100
    assert sum(item["operating_cents"] for item in priorities) == release[
        "gross_operating_cents"
    ]
    assert sum(item["capital_cents"] for item in priorities) == release["capital_cents"]


def test_proposed_department_slices_match_release() -> None:
    data = _dataset()
    release = data["release"]
    departments = data["department_budgets"]

    assert len(departments) == 86
    assert sum(item["operating_cents"] for item in departments) == release[
        "gross_operating_cents"
    ]
    assert sum(item["capital_cents"] for item in departments) == release["capital_cents"]
    assert sum(item["employee_count"] or 0 for item in departments) == release["employees"]
    assert all(item["total_budget_cents"] >= 0 for item in departments)
