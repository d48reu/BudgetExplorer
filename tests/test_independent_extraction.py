"""Independent verification of the published figures against the source PDFs.

Every number asserted here as a constant was read off the published documents
themselves (page citations inline), not copied from pipeline output. The
per-row assertions re-derive department figures with the standalone parsers in
:mod:`tests.independent_extract` and compare them to the shipped audit ledger.

The source PDFs are gitignored, so these tests skip when ``data/`` has not
been populated. ``python -m pipeline run-all`` fetches the adopted appendices
and ``python -m pipeline extract-proposed`` the proposed volume; either way
the files land in ``data/``. They can also be downloaded straight from the
``sourceUrl`` values in ``public/audit/source-manifest.json``, which is where
the hashes checked here come from.
"""

from __future__ import annotations

import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

import pytest

from tests.independent_extract import (
    ADOPTED_AREAS,
    MERGED_TOKEN_ROWS,
    extract_appendix_a,
    extract_appendix_c,
    extract_appendix_h,
    extract_appendix_j,
)

ROOT = Path(__file__).parents[1]
MANIFEST = ROOT / "budget-explorer-web" / "public" / "audit" / "source-manifest.json"
LEDGER = ROOT / "budget-explorer-web" / "public" / "audit" / "number-ledger.csv"

THOUSANDS_TO_CENTS = 100_000

# --- figures read directly from the published PDFs -------------------------
# FY 2025-26 Budget in Brief, pages 3-4
ADOPTED_TOTAL_BUDGET = 13_233_238  # thousands
ADOPTED_NET_OPERATING = 8_575_606
ADOPTED_CAPITAL = 4_657_632
ADOPTED_EMPLOYEES = 31_996
# Appendix C department rows are gross; the printed Grand Total is net.
ADOPTED_GROSS_OPERATING = 9_501_308
ADOPTED_INTERAGENCY = ADOPTED_GROSS_OPERATING - ADOPTED_NET_OPERATING  # 925,702

# FY 2026-27 proposed Budget in Brief, page 3; Volume 1 Appendix A p.116 / H p.145
PROPOSED_NET_OPERATING = 9_021_676
PROPOSED_CAPITAL = 5_239_548
PROPOSED_EMPLOYEES = 31_942
# Appendix A restates the prior year: 31,998 positions, not the 31,996 the
# adopted Budget in Brief printed. The county's own restatement, not a defect.
PROPOSED_RESTATED_ADOPTED_POSITIONS = 31_998
PROPOSED_RESTATED_ADOPTED_OPERATING = 8_575_606

# PDF department name -> ledger entity name
DEPARTMENT_ALIASES = {
    "sheriff's office": "sheriff",
    "communications, information and technology": "information and technology",
    "communications, information and": "information and technology",
    "community services": "community services department",
    "library department": "library",
}


def _normalise(name: str) -> str:
    name = name.replace("&", "and").strip().lower()
    return DEPARTMENT_ALIASES.get(name, name)


def _manifest() -> dict[str, dict]:
    return {entry["id"]: entry for entry in json.loads(MANIFEST.read_text("utf-8"))}


def _source(source_id: str) -> Path:
    """Path to a verified source PDF, skipping the test when unavailable."""
    entry = _manifest()[source_id]
    path = ROOT / entry["file"]
    if not path.exists():
        pytest.skip(f"source PDF not present: {entry['file']}")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest == entry["sha256"], (
        f"{entry['file']} does not match the manifest hash; the published "
        f"document changed or the local copy is corrupt"
    )
    return path


def _ledger_rows(release: str) -> dict[tuple[str, str], dict[str, str]]:
    with LEDGER.open(encoding="utf-8-sig", newline="") as handle:
        rows = [
            row
            for row in csv.DictReader(handle)
            if row["section"] == "Department rows" and row["release"] == release
        ]
    entities: dict[tuple[str, str], dict[str, str]] = defaultdict(dict)
    for row in rows:
        entity = row["entity"]
        for dash in ("—", "–"):
            if dash in entity:
                department, area = entity.rsplit(dash, 1)
                break
        else:
            department, area = entity, ""
        entities[(_normalise(department), _normalise(area))][row["metric"]] = (
            row["expected"]
        )
    return entities


# --------------------------- adopted release ------------------------------


def test_appendix_c_departments_foot_to_printed_area_totals() -> None:
    """Each area's departments must sum to the area total printed beside them."""
    rows, area_totals = extract_appendix_c(_source("adopted-appendix-c"))

    assert sorted(area_totals) == sorted(ADOPTED_AREAS)
    for area in ADOPTED_AREAS:
        extracted = sum(
            value.get("operating", 0)
            for (_department, row_area), value in rows.items()
            if row_area == area
        )
        assert extracted == area_totals[area], f"{area} does not foot"


def test_appendix_c_reconciles_to_published_headlines() -> None:
    rows, _ = extract_appendix_c(_source("adopted-appendix-c"))

    gross = sum(value.get("operating", 0) for value in rows.values())
    positions = sum(value.get("positions", 0) for value in rows.values())

    assert gross == ADOPTED_GROSS_OPERATING
    assert gross - ADOPTED_INTERAGENCY == ADOPTED_NET_OPERATING
    assert positions == ADOPTED_EMPLOYEES


def test_appendix_j_reconciles_to_published_capital() -> None:
    capital = extract_appendix_j(_source("adopted-appendix-j"))
    assert sum(capital.values()) == ADOPTED_CAPITAL


def test_adopted_headline_totals_are_internally_consistent() -> None:
    assert ADOPTED_NET_OPERATING + ADOPTED_CAPITAL == ADOPTED_TOTAL_BUDGET


def test_adopted_department_rows_match_the_published_ledger() -> None:
    """Re-derive every adopted department figure and compare to the ledger."""
    operating, _ = extract_appendix_c(_source("adopted-appendix-c"))
    capital = extract_appendix_j(_source("adopted-appendix-j"))

    extracted: dict[tuple[str, str], dict[str, int]] = defaultdict(dict)
    for (department, area), value in operating.items():
        key = (_normalise(department), _normalise(area))
        extracted[key]["operating budget"] = value.get("operating", 0)
        extracted[key]["funded positions"] = value.get("positions", 0)
    for (department, area), value in capital.items():
        extracted[(_normalise(department), _normalise(area))]["capital budget"] = value

    ledger = _ledger_rows("FY 2025-26")
    assert ledger, "no adopted department rows in the ledger"

    mismatches = []
    compared = 0
    for key, expected in ledger.items():
        mine = extracted.get(key)
        assert mine is not None, f"ledger entity missing from extraction: {key}"
        for metric, scale in (
            ("operating budget", THOUSANDS_TO_CENTS),
            ("capital budget", THOUSANDS_TO_CENTS),
            ("funded positions", 1),
        ):
            if metric not in expected:
                continue
            compared += 1
            actual = mine.get(metric, 0) * scale
            if int(expected[metric]) != actual:
                mismatches.append((key, metric, expected[metric], actual))
        if "total budget" in expected:
            compared += 1
            actual = (
                mine.get("operating budget", 0) + mine.get("capital budget", 0)
            ) * THOUSANDS_TO_CENTS
            if int(expected["total budget"]) != actual:
                mismatches.append((key, "total budget", expected["total budget"], actual))

    assert not mismatches, f"{len(mismatches)} of {compared} disagree: {mismatches[:5]}"
    assert compared > 300, f"suspiciously few comparisons: {compared}"


# --------------------------- proposed release -----------------------------


def test_appendix_h_reconciles_to_published_capital() -> None:
    rows, area_totals, grand = extract_appendix_h(_source("proposed-volume-1"))

    assert sum(rows.values()) == PROPOSED_CAPITAL
    assert sum(area_totals.values()) == PROPOSED_CAPITAL
    assert grand["capital_26_27"] == PROPOSED_CAPITAL


def test_appendix_a_totals_reconcile_gross_to_net() -> None:
    """Department rows are gross; the printed Grand Total is net."""
    result = extract_appendix_a(_source("proposed-volume-1"))
    gross, grand = result["gross"], result["grand_total"]

    # Positions are the final pair on every row, so they total even though one
    # row's funding columns are merged into a single token by the text layer.
    assert gross["positions_26_27"] == PROPOSED_EMPLOYEES
    assert gross["positions_25_26"] == PROPOSED_RESTATED_ADOPTED_POSITIONS

    assert grand["operating_26_27"] == PROPOSED_NET_OPERATING
    assert grand["operating_25_26"] == PROPOSED_RESTATED_ADOPTED_OPERATING
    assert grand["positions_26_27"] == PROPOSED_EMPLOYEES

    # The prior-year column of the proposed book must agree with the adopted
    # book's own appendix -- a cross-document check on two separate PDFs.
    assert grand["operating_25_26"] == ADOPTED_NET_OPERATING

    assert result["merged_rows"] == MERGED_TOKEN_ROWS, (
        "the number of rows damaged by the PDF text layer changed; re-read "
        "Appendix A before trusting these totals"
    )


def test_proposed_capital_rows_match_the_published_ledger() -> None:
    rows, _, _ = extract_appendix_h(_source("proposed-volume-1"))

    extracted: dict[tuple[str, str], int] = defaultdict(int)
    for (department, area), value in rows.items():
        extracted[(_normalise(department), _normalise(area))] += value

    ledger = _ledger_rows("FY 2026-27")
    assert ledger, "no proposed department rows in the ledger"

    mismatches = []
    compared = 0
    for key, expected in ledger.items():
        if "capital budget" not in expected:
            continue
        compared += 1
        actual = extracted.get(key, 0) * THOUSANDS_TO_CENTS
        if int(expected["capital budget"]) != actual:
            mismatches.append((key, expected["capital budget"], actual))

    assert not mismatches, f"{len(mismatches)} of {compared} disagree: {mismatches[:5]}"
    assert compared > 80, f"suspiciously few comparisons: {compared}"
