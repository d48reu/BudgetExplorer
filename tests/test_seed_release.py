"""Tests for release-scoped budget seeding safeguards."""

from unittest.mock import MagicMock

import pytest

from pipeline.load.seed import seed_all, seed_budget_release, seed_fiscal_year


def test_seed_budget_release_uses_fiscal_year_and_stage():
    conn = MagicMock()
    cursor = conn.cursor.return_value
    totals = {
        "operating_cents": 902_167_600_000,
        "gross_operating_cents": 989_776_200_000,
        "interagency_transfers_cents": 87_608_600_000,
        "capital_cents": 523_954_800_000,
        "total_cents": 1_426_122_400_000,
        "employees": 31_942,
    }

    seed_budget_release(
        conn,
        7,
        "proposed",
        totals,
        {"as_of_date": "2026-07-15", "volume_1_url": "https://example.test/v1"},
    )

    params = cursor.execute.call_args.args[1]
    assert params[:4] == (7, "proposed", "2026-07-15", None)
    assert params[4:10] == (
        902_167_600_000,
        989_776_200_000,
        87_608_600_000,
        523_954_800_000,
        1_426_122_400_000,
        31_942,
    )
    assert params[11] == "https://example.test/v1"


def test_proposed_seed_requires_explicit_release_totals():
    with pytest.raises(ValueError, match="proposed load requires explicit release totals"):
        seed_all(MagicMock(), {}, fiscal_year_label="FY 2026-27", stage="proposed")


def test_proposed_fiscal_year_does_not_write_legacy_totals():
    conn = MagicMock()
    cursor = conn.cursor.return_value
    cursor.fetchone.return_value = (7,)

    seed_fiscal_year(
        conn,
        "FY 2026-27",
        "2026-10-01",
        "2027-09-30",
        {
            "operating_cents": 1,
            "capital_cents": 2,
            "total_cents": 3,
            "employees": 4,
        },
        is_adopted=False,
    )

    params = cursor.execute.call_args.args[1]
    assert params[3:7] == (None, None, None, None)
    assert params[7] is False
