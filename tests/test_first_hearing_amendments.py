"""Exact, source-backed checks for the FY 2026-27 first-hearing layer."""

from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path


ROOT = Path(__file__).parents[1]
DATA = (
    ROOT
    / "budget-explorer-web"
    / "src"
    / "data"
    / "fy-2026-27-first-hearing-amendments.json"
)
MANIFEST = ROOT / "budget-explorer-web" / "public" / "audit" / "source-manifest.json"


def _data() -> dict:
    return json.loads(DATA.read_text(encoding="utf-8"))


def _sources(data: dict) -> dict[str, dict]:
    return {source["id"]: source for source in data["sourceDocuments"]}


def test_amendment_layer_is_dated_and_tentative() -> None:
    data = _data()
    assert data["schemaVersion"] == 1
    assert data["fiscalYear"] == "FY 2026-27"
    assert data["status"] == "tentative-first-hearing"
    assert date.fromisoformat(data["baseReleaseDate"]) < date.fromisoformat(
        data["hearingDate"]
    )
    assert date.fromisoformat(data["hearingDate"]) <= date.fromisoformat(
        data["lastVerifiedDate"]
    )
    assert date.fromisoformat(data["lastVerifiedDate"]) < date.fromisoformat(
        data["finalHearingDate"]
    )
    assert "Do not calculate" in data["displayPolicy"]["releaseTotals"]


def test_every_tracked_item_has_a_reproducible_source_location() -> None:
    data = _data()
    sources = _sources(data)
    assert sources

    for group in ("memoChanges", "hearingActions", "pendingItems", "sourceCaveats"):
        for item in data[group]:
            assert item["sourceId"] in sources
            source = sources[item["sourceId"]]
            if source["kind"] == "pdf":
                assert item["sourcePages"]
                assert all(1 <= page <= source["pages"] for page in item["sourcePages"])
            if source["kind"] == "recording":
                assert item["sourceTime"]


def test_clerk_operating_transfer_balances_exactly() -> None:
    data = _data()
    clerk = next(
        item for item in data["memoChanges"] if item["id"] == "clerk-erp-transfer"
    )
    assert clerk["amountCents"] == 3_000_200_000
    assert sum(offset["amountCents"] for offset in clerk["offsets"]) == clerk[
        "amountCents"
    ]
    assert sum(offset["positions"] for offset in clerk["offsets"]) == clerk[
        "positionChange"
    ]
    assert clerk["netCountywideChangeCents"] == 0
    assert clerk["netCountywidePositionChange"] == 0


def test_transfers_and_reallocations_are_not_counted_as_new_spending() -> None:
    data = _data()
    for item in data["memoChanges"]:
        if item["classification"] in {"Transfer", "Reallocation"}:
            assert item["netCountywideChangeCents"] == 0


def test_position_transfers_and_true_position_change_are_separate() -> None:
    data = _data()
    property_appraiser = next(
        item
        for item in data["memoChanges"]
        if item["id"] == "property-appraiser-position"
    )
    assert property_appraiser["positionChange"] == -1
    assert property_appraiser["netCountywidePositionChange"] == -1

    community_services = next(
        item
        for item in data["memoChanges"]
        if item["id"] == "community-services-liheap"
    )
    assert community_services["positionChange"] == -6
    assert community_services["netCountywidePositionChange"] == 0


def test_countywide_general_fund_control_total_is_exact() -> None:
    data = _data()
    control = data["publishedControlTotals"]
    assert control["countywideGeneralFundCents"] == 287_360_500_000
    assert control["sourcePages"] == [24]
    assert "not the all-funds" in control["note"]


def test_county_source_discrepancy_is_not_silently_resolved() -> None:
    data = _data()
    caveat = next(
        item
        for item in data["sourceCaveats"]
        if item["id"] == "community-services-grant-classification"
    )
    assert caveat["amountCents"] == 36_900_000
    assert caveat["sourcePages"] == [4, 25]
    assert "state-grant" in caveat["summary"]
    assert "Federal Grants" in caveat["summary"]
    assert "does not assign" in caveat["summary"]


def test_memo_fingerprint_matches_manifest_and_local_copy_when_present() -> None:
    data = _data()
    source = _sources(data)["first-hearing-memo"]
    manifest = {
        item["id"]: item
        for item in json.loads(MANIFEST.read_text(encoding="utf-8"))
    }
    assert manifest["first-hearing-memo"] == {
        key: source[key]
        for key in ("id", "label", "file", "sourceUrl", "sha256", "bytes", "pages")
    }

    local_copy = ROOT / source["file"]
    if local_copy.exists():
        assert local_copy.stat().st_size == source["bytes"]
        assert hashlib.sha256(local_copy.read_bytes()).hexdigest() == source["sha256"]
