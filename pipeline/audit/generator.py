"""Build a source-to-database number ledger and public audit summary.

The audit intentionally uses more than one verification layer:

* independently transcribed headline, revenue, allocation, and tax figures;
* fresh row extraction from the official appendices;
* exact database comparisons (no tolerance for integer source values); and
* internal reconciliation of department rows back to release totals.

Every official PDF is fingerprinted and every extracted row retains a source
page so a reviewer can reproduce a check without trusting the website.
"""

from __future__ import annotations

import csv
import hashlib
import json
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

import pdfplumber

from pipeline.config import (
    APPENDIX_C_PATH,
    APPENDIX_C_URL,
    APPENDIX_J_PATH,
    APPENDIX_J_URL,
    DATABASE_URL,
    PDF_PATH,
    PDF_URL,
    PROPOSED_BIB_PATH,
    PROPOSED_VOLUME_1_PATH,
)
from pipeline.extract.appendix_c import extract_appendix_c
from pipeline.extract.appendix_j import extract_appendix_j
from pipeline.extract.proposed import (
    PROPOSED_BIB_URL,
    PROPOSED_VOLUME_1_URL,
    extract_proposed_budget,
)
from pipeline.load.db import get_db_connection
from pipeline.load.seed import (
    _build_department_lookup,
    _build_strategic_area_lookup,
    _resolve_department_id,
    _resolve_strategic_area_id,
)
from pipeline.transform.clean import (
    clean_department_name,
    clean_employee_count,
    thousands_to_cents,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
EXPECTATIONS_PATH = (
    PROJECT_ROOT / "pipeline" / "data" / "official_numeric_expectations.json"
)
DEFAULT_PUBLIC_DIR = PROJECT_ROOT / "budget-explorer-web" / "public" / "audit"
DEFAULT_SITE_DATA_PATH = (
    PROJECT_ROOT / "budget-explorer-web" / "src" / "data" / "budget-audit.json"
)


@dataclass
class AuditRow:
    check_id: str
    release: str
    stage: str
    section: str
    entity: str
    metric: str
    expected: str | None
    actual: str | None
    unit: str
    difference: str | None
    status: str
    method: str
    source_document: str
    source_page: str
    source_url: str
    notes: str
    release_gate: bool


def _value(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return format(value, "f")
    return str(value)


def _difference(expected: Any, actual: Any) -> str | None:
    if expected is None or actual is None:
        return None
    return _value(Decimal(str(actual)) - Decimal(str(expected)))


def _same(expected: Any, actual: Any) -> bool:
    if expected is None or actual is None:
        return expected is actual
    return Decimal(str(expected)) == Decimal(str(actual))


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _source_manifest() -> list[dict]:
    sources = (
        (
            "adopted-bib",
            "FY 2025-26 adopted Budget in Brief",
            PROJECT_ROOT / PDF_PATH,
            PDF_URL,
        ),
        (
            "adopted-appendix-c",
            "FY 2025-26 Appendix C",
            PROJECT_ROOT / APPENDIX_C_PATH,
            APPENDIX_C_URL,
        ),
        (
            "adopted-appendix-j",
            "FY 2025-26 Appendix J",
            PROJECT_ROOT / APPENDIX_J_PATH,
            APPENDIX_J_URL,
        ),
        (
            "proposed-bib",
            "FY 2026-27 proposed Budget in Brief",
            PROJECT_ROOT / PROPOSED_BIB_PATH,
            PROPOSED_BIB_URL,
        ),
        (
            "proposed-volume-1",
            "FY 2026-27 proposed Volume 1",
            PROJECT_ROOT / PROPOSED_VOLUME_1_PATH,
            PROPOSED_VOLUME_1_URL,
        ),
    )
    manifest = []
    for source_id, label, path, url in sources:
        if not path.exists():
            raise FileNotFoundError(f"Required audit source is missing: {path}")
        with pdfplumber.open(path) as pdf:
            pages = len(pdf.pages)
        manifest.append({
            "id": source_id,
            "label": label,
            "file": path.relative_to(PROJECT_ROOT).as_posix(),
            "sourceUrl": url,
            "sha256": _sha256(path),
            "bytes": path.stat().st_size,
            "pages": pages,
        })
    return manifest


def _db_department_rows(cur, fiscal_year: str, stage: str) -> dict:
    cur.execute(
        """
        SELECT db.department_id, db.strategic_area_id, d.name, sa.name,
               db.operating_budget, db.capital_budget, db.total_budget,
               db.employee_count, db.baseline_operating_budget,
               db.baseline_employee_count
        FROM department_budgets db
        JOIN fiscal_years fy ON fy.id = db.fiscal_year_id
        JOIN departments d ON d.id = db.department_id
        LEFT JOIN strategic_areas sa ON sa.id = db.strategic_area_id
        WHERE fy.label = %s AND db.stage = %s
        """,
        (fiscal_year, stage),
    )
    return {
        (row[0], row[1]): {
            "department": row[2],
            "area": row[3],
            "operating": row[4],
            "capital": row[5],
            "total": row[6],
            "employees": row[7],
            "baseline_operating": row[8],
            "baseline_employees": row[9],
        }
        for row in cur.fetchall()
    }


def _db_area_rows(cur, fiscal_year: str, stage: str) -> dict:
    cur.execute(
        """
        SELECT sab.strategic_area_id, sa.name, sab.operating_budget,
               sab.capital_budget, sab.cents_per_dollar
        FROM strategic_area_budgets sab
        JOIN fiscal_years fy ON fy.id = sab.fiscal_year_id
        JOIN strategic_areas sa ON sa.id = sab.strategic_area_id
        WHERE fy.label = %s AND sab.stage = %s
        """,
        (fiscal_year, stage),
    )
    return {
        row[0]: {
            "area": row[1],
            "operating": row[2],
            "capital": row[3],
            "cents": row[4],
        }
        for row in cur.fetchall()
    }


def _release_row(cur, fiscal_year: str, stage: str) -> dict:
    cur.execute(
        """
        SELECT br.total_operating, br.gross_operating,
               br.interagency_transfers, br.total_capital, br.total_budget,
               br.total_employees
        FROM budget_releases br
        JOIN fiscal_years fy ON fy.id = br.fiscal_year_id
        WHERE fy.label = %s AND br.stage = %s
        """,
        (fiscal_year, stage),
    )
    row = cur.fetchone()
    if row is None:
        raise ValueError(f"Release missing from database: {fiscal_year} {stage}")
    return {
        "net_operating_cents": row[0],
        "gross_operating_cents": row[1],
        "interagency_transfers_cents": row[2],
        "capital_cents": row[3],
        "total_budget_cents": row[4],
        "employees": row[5],
    }


def _db_revenue(cur, fiscal_year: str, stage: str) -> dict:
    cur.execute(
        """
        SELECT rs.name, r.amount, r.percentage
        FROM revenue_by_source r
        JOIN revenue_sources rs ON rs.id = r.revenue_source_id
        JOIN fiscal_years fy ON fy.id = r.fiscal_year_id
        WHERE fy.label = %s AND r.stage = %s
        """,
        (fiscal_year, stage),
    )
    return {row[0]: {"amount": row[1], "percentage": row[2]} for row in cur}


def _db_millage(cur, fiscal_year: str, stage: str) -> dict:
    cur.execute(
        """
        SELECT authority, millage_rate
        FROM millage_rates m
        JOIN fiscal_years fy ON fy.id = m.fiscal_year_id
        WHERE fy.label = %s AND m.stage = %s
        ORDER BY m.display_order
        """,
        (fiscal_year, stage),
    )
    result = {}
    for authority, rate in cur:
        key = "Other" if authority.startswith("Other") else authority
        result[key] = rate
    return result


def _page_string(*pages: Any) -> str:
    flattened = []
    for page in pages:
        if isinstance(page, (list, tuple, set)):
            flattened.extend(item for item in page if item is not None)
        elif page is not None:
            flattened.append(page)
    values = sorted({str(page) for page in flattened})
    return ", ".join(values)


def generate_audit(
    database_url: str = DATABASE_URL,
    public_dir: str | Path = DEFAULT_PUBLIC_DIR,
    site_data_path: str | Path = DEFAULT_SITE_DATA_PATH,
) -> dict:
    """Generate the exact numeric ledger, source manifest, and site summary."""
    public_dir = Path(public_dir)
    site_data_path = Path(site_data_path)
    public_dir.mkdir(parents=True, exist_ok=True)
    site_data_path.parent.mkdir(parents=True, exist_ok=True)

    with EXPECTATIONS_PATH.open(encoding="utf-8") as handle:
        expectations = json.load(handle)

    manifest = _source_manifest()
    adopted_c = extract_appendix_c(str(PROJECT_ROOT / APPENDIX_C_PATH))
    adopted_j = extract_appendix_j(str(PROJECT_ROOT / APPENDIX_J_PATH))
    proposed = extract_proposed_budget(
        str(PROJECT_ROOT / PROPOSED_BIB_PATH),
        str(PROJECT_ROOT / PROPOSED_VOLUME_1_PATH),
    )

    rows: list[AuditRow] = []

    def add(
        release: str,
        stage: str,
        section: str,
        entity: str,
        metric: str,
        expected: Any,
        actual: Any,
        unit: str,
        method: str,
        source_document: str,
        source_page: Any,
        source_url: str,
        notes: str = "",
        release_gate: bool = True,
    ) -> None:
        rows.append(AuditRow(
            check_id=f"N{len(rows) + 1:04d}",
            release=release,
            stage=stage,
            section=section,
            entity=entity,
            metric=metric,
            expected=_value(expected),
            actual=_value(actual),
            unit=unit,
            difference=_difference(expected, actual),
            status="PASS" if _same(expected, actual) else "FAIL",
            method=method,
            source_document=source_document,
            source_page=_page_string(source_page),
            source_url=source_url,
            notes=notes,
            release_gate=release_gate,
        ))

    with get_db_connection(database_url) as conn:
        cur = conn.cursor()
        department_lookup = _build_department_lookup(cur)
        area_lookup = _build_strategic_area_lookup(cur)

        release_details = {}
        for key, official in expectations.items():
            fiscal_year, stage = key.split("|")
            db_release = _release_row(cur, fiscal_year, stage)
            release_details[key] = db_release
            for metric, expected in official["headlines"].items():
                add(
                    fiscal_year, stage, "Release headlines", official["label"],
                    metric, expected, db_release[metric],
                    "positions" if metric == "employees" else "cents",
                    "independent transcription → database",
                    "Budget in Brief", official["headline_page"],
                    official["budget_in_brief_url"],
                )

            db_revenue = _db_revenue(cur, fiscal_year, stage)
            for expected in official["revenue"]:
                actual = db_revenue.get(expected["source"], {})
                add(
                    fiscal_year, stage, "Revenue", expected["source"],
                    "amount", expected["amount_cents"], actual.get("amount"),
                    "cents", "independent transcription → database",
                    "Budget in Brief", official["revenue_page"],
                    official["budget_in_brief_url"],
                )
                add(
                    fiscal_year, stage, "Revenue", expected["source"],
                    "published percentage", Decimal(expected["percentage"]),
                    actual.get("percentage"), "percent",
                    "independent transcription → database",
                    "Budget in Brief", official["revenue_page"],
                    official["budget_in_brief_url"],
                    "Published percentages are rounded and sum to 101%.",
                )

            db_millage = _db_millage(cur, fiscal_year, stage)
            for expected in official["millage"]:
                add(
                    fiscal_year, stage, "Tax rates", expected["authority"],
                    "millage rate", Decimal(expected["millage_rate"]),
                    db_millage.get(expected["authority"]), "mills",
                    "independent transcription → database",
                    "Budget in Brief", official["millage_page"],
                    official["budget_in_brief_url"],
                )

        # Adopted department/area rows: fresh Appendix C/J extraction versus DB.
        adopted_db = _db_department_rows(cur, "FY 2025-26", "adopted")
        c_rows = {}
        for source in adopted_c["departments"]:
            department_id = _resolve_department_id(
                clean_department_name(source["department"]), department_lookup
            )
            area_id = _resolve_strategic_area_id(
                clean_department_name(source["strategic_area"]), area_lookup
            )
            if department_id is None:
                current_operating = thousands_to_cents(source.get("adopted_25_26"))
                current_positions = clean_employee_count(
                    source.get("positions_25_26")
                ) or 0
                # Appendix C retains legacy departments with zero values in
                # the current column. They support historical extraction but
                # are not current-release facts and are intentionally absent
                # from the adopted database slice.
                if current_operating == 0 and current_positions == 0:
                    continue
                raise ValueError(
                    "Active Appendix C department could not be resolved: "
                    f"{source['department']}"
                )
            c_rows[(department_id, area_id)] = source

        j_rows = defaultdict(lambda: {"capital": 0, "pages": []})
        for source in adopted_j["departments"]:
            department_id = _resolve_department_id(
                clean_department_name(source["department"]), department_lookup
            )
            area_id = _resolve_strategic_area_id(
                clean_department_name(source["strategic_area"]), area_lookup
            )
            if department_id is None:
                if thousands_to_cents(source.get("total_25_26")) == 0:
                    continue
                raise ValueError(
                    "Active Appendix J department could not be resolved: "
                    f"{source['department']}"
                )
            bucket = j_rows[(department_id, area_id)]
            bucket["capital"] += thousands_to_cents(source["total_25_26"])
            bucket["pages"].append(source.get("source_page"))

        adopted_keys = set(c_rows) | set(j_rows) | set(adopted_db)
        for key in sorted(adopted_keys, key=lambda item: (item[1] or 0, item[0] or 0)):
            source_c = c_rows.get(key)
            source_j = j_rows.get(key)
            actual = adopted_db.get(key)
            source_exists = key in c_rows or key in j_rows
            entity = (
                f"{actual['department']} — {actual['area']}" if actual else
                f"{(source_c or {}).get('department', 'unresolved')} — "
                f"{(source_c or {}).get('strategic_area', 'unresolved')}"
            )
            add(
                "FY 2025-26", "adopted", "Department rows", entity,
                "source row present", int(source_exists), int(actual is not None),
                "record", "fresh appendix extraction → database",
                "Appendix C / Appendix J",
                _page_string(
                    (source_c or {}).get("source_page"),
                    *((source_j or {}).get("pages", [])),
                ),
                APPENDIX_C_URL,
            )
            if actual is None:
                continue
            operating = (
                thousands_to_cents(source_c.get("adopted_25_26"))
                if source_c else 0
            )
            capital = source_j["capital"] if source_j else 0
            employees = (
                clean_employee_count(source_c.get("positions_25_26"))
                if source_c else None
            )
            for metric, expected, actual_value, unit, document, pages, url in (
                ("operating budget", operating, actual["operating"], "cents",
                 "Appendix C", (source_c or {}).get("source_page"), APPENDIX_C_URL),
                ("capital budget", capital, actual["capital"], "cents",
                 "Appendix J", (source_j or {}).get("pages", []), APPENDIX_J_URL),
                ("funded positions", employees, actual["employees"], "positions",
                 "Appendix C", (source_c or {}).get("positions_source_page"), APPENDIX_C_URL),
                ("total budget", operating + capital, actual["total"], "cents",
                 "Appendix C + Appendix J",
                 _page_string((source_c or {}).get("source_page"),
                              *((source_j or {}).get("pages", []))), APPENDIX_C_URL),
            ):
                if expected is None and actual_value is None:
                    continue
                add(
                    "FY 2025-26", "adopted", "Department rows", entity,
                    metric, expected, actual_value, unit,
                    "fresh appendix extraction → database", document, pages, url,
                )

        adopted_area_db = _db_area_rows(cur, "FY 2025-26", "adopted")
        c_area = {}
        for source in adopted_c["area_totals"]:
            area_id = _resolve_strategic_area_id(source["strategic_area"], area_lookup)
            c_area[area_id] = source
        j_area = {}
        for source in adopted_j["area_totals"]:
            area_id = _resolve_strategic_area_id(source["strategic_area"], area_lookup)
            j_area[area_id] = source
        adopted_penny = {
            _resolve_strategic_area_id(item["area"], area_lookup): item
            for item in expectations["FY 2025-26|adopted"]["allocation"]
        }
        for area_id in sorted(
            set(c_area) | set(j_area) | set(adopted_area_db),
            key=lambda value: value or 0,
        ):
            actual = adopted_area_db.get(area_id, {})
            source_c = c_area.get(area_id, {})
            source_j = j_area.get(area_id, {})
            penny = adopted_penny.get(area_id, {})
            entity = actual.get("area") or source_c.get("strategic_area", "unresolved")
            add(
                "FY 2025-26", "adopted", "Strategic areas", entity,
                "operating budget", thousands_to_cents(source_c.get("adopted_25_26")),
                actual.get("operating"), "cents",
                "fresh appendix extraction → database", "Appendix C",
                source_c.get("source_page"), APPENDIX_C_URL,
            )
            add(
                "FY 2025-26", "adopted", "Strategic areas", entity,
                "capital budget", thousands_to_cents(source_j.get("total_25_26")),
                actual.get("capital"), "cents",
                "fresh appendix extraction → database", "Appendix J",
                source_j.get("source_page"), APPENDIX_J_URL,
            )
            add(
                "FY 2025-26", "adopted", "Strategic areas", entity,
                "cents per dollar", penny.get("cents_per_dollar"),
                actual.get("cents"), "cents per dollar",
                "independent transcription → database", "Budget in Brief",
                expectations["FY 2025-26|adopted"]["allocation_page"], PDF_URL,
                "Allocation is a rounded communication graphic, not an accounting split.",
            )

        # Proposed department/priority rows: coordinate-aware source extraction.
        proposed_db = _db_department_rows(cur, "FY 2026-27", "proposed")
        proposed_source = {}
        for source in proposed["department_budgets"]:
            department_id = _resolve_department_id(
                clean_department_name(source["department"]), department_lookup
            )
            area_id = _resolve_strategic_area_id(source["priority"], area_lookup)
            proposed_source[(department_id, area_id)] = source

        proposed_keys = set(proposed_source) | set(proposed_db)
        for key in sorted(proposed_keys, key=lambda item: (item[1] or 0, item[0] or 0)):
            source = proposed_source.get(key)
            actual = proposed_db.get(key)
            entity = (
                f"{actual['department']} — {actual['area']}" if actual else
                f"{(source or {}).get('department', 'unresolved')} — "
                f"{(source or {}).get('priority', 'unresolved')}"
            )
            add(
                "FY 2026-27", "proposed", "Department rows", entity,
                "source row present", int(source is not None), int(actual is not None),
                "record", "fresh coordinate extraction → database",
                "Proposed Volume 1, Appendix A / H",
                _page_string(
                    (source or {}).get("operating_source_page"),
                    (source or {}).get("capital_source_page"),
                ),
                PROPOSED_VOLUME_1_URL,
            )
            if source is None or actual is None:
                continue
            comparisons = (
                ("operating budget", source["operating_cents"], actual["operating"],
                 "cents", source.get("operating_source_page")),
                ("capital budget", source["capital_cents"], actual["capital"],
                 "cents", source.get("capital_source_page")),
                ("total budget", source["total_budget_cents"], actual["total"],
                 "cents", _page_string(source.get("operating_source_page"),
                                       source.get("capital_source_page"))),
                ("funded positions", source["employee_count"], actual["employees"],
                 "positions", source.get("operating_source_page")),
                ("restated adopted operating",
                 source["restated_adopted_operating_cents"],
                 actual["baseline_operating"], "cents",
                 source.get("operating_source_page")),
                ("restated adopted positions",
                 source["restated_adopted_positions"],
                 actual["baseline_employees"], "positions",
                 source.get("operating_source_page")),
            )
            for metric, expected, actual_value, unit, page in comparisons:
                if expected is None and actual_value is None:
                    continue
                add(
                    "FY 2026-27", "proposed", "Department rows", entity,
                    metric, expected, actual_value, unit,
                    "fresh coordinate extraction → database",
                    "Proposed Volume 1, Appendix A / H", page,
                    PROPOSED_VOLUME_1_URL,
                )

        proposed_area_db = _db_area_rows(cur, "FY 2026-27", "proposed")
        proposed_priorities = {
            _resolve_strategic_area_id(item["name"], area_lookup): item
            for item in proposed["priorities"]
        }
        proposed_penny = {
            _resolve_strategic_area_id(item["area"], area_lookup): item
            for item in expectations["FY 2026-27|proposed"]["allocation"]
        }
        for area_id in sorted(
            set(proposed_priorities) | set(proposed_area_db),
            key=lambda value: value or 0,
        ):
            source = proposed_priorities.get(area_id, {})
            actual = proposed_area_db.get(area_id, {})
            penny = proposed_penny.get(area_id, {})
            entity = actual.get("area") or source.get("name", "unresolved")
            add(
                "FY 2026-27", "proposed", "Strategic areas", entity,
                "operating budget", source.get("operating_cents"),
                actual.get("operating"), "cents",
                "Appendix A department rollup → database", "Proposed Volume 1",
                "109–116", PROPOSED_VOLUME_1_URL,
            )
            add(
                "FY 2026-27", "proposed", "Strategic areas", entity,
                "capital budget", source.get("capital_cents"),
                actual.get("capital"), "cents",
                "Appendix H department rollup → database", "Proposed Volume 1",
                "144–145", PROPOSED_VOLUME_1_URL,
            )
            add(
                "FY 2026-27", "proposed", "Strategic areas", entity,
                "cents per dollar", penny.get("cents_per_dollar"),
                actual.get("cents"), "cents per dollar",
                "independent transcription → database", "Budget in Brief",
                expectations["FY 2026-27|proposed"]["allocation_page"],
                PROPOSED_BIB_URL,
                "Allocation is a rounded communication graphic, not an accounting split.",
            )

        # Exact release reconciliation from loaded rows.
        for fiscal_year, stage, db_rows, appendix_doc, appendix_page, source_url in (
            ("FY 2025-26", "adopted", adopted_db, "Appendix C / J", "1–22 / 1–18", APPENDIX_C_URL),
            ("FY 2026-27", "proposed", proposed_db, "Proposed Volume 1", "109–116 / 144–145", PROPOSED_VOLUME_1_URL),
        ):
            release = release_details[f"{fiscal_year}|{stage}"]
            gross = sum((row["operating"] or 0) for row in db_rows.values())
            capital = sum((row["capital"] or 0) for row in db_rows.values())
            employees = sum((row["employees"] or 0) for row in db_rows.values())
            net = gross - release["interagency_transfers_cents"]
            total = net + capital
            for metric, expected, actual, unit in (
                ("gross operating rollup", release["gross_operating_cents"], gross, "cents"),
                ("capital rollup", release["capital_cents"], capital, "cents"),
                ("employee rollup", release["employees"], employees, "positions"),
                ("net operating equation", release["net_operating_cents"], net, "cents"),
                ("total budget equation", release["total_budget_cents"], total, "cents"),
            ):
                add(
                    fiscal_year, stage, "Release reconciliation",
                    f"{fiscal_year} {stage}", metric, expected, actual, unit,
                    "database rows → release total", appendix_doc, appendix_page,
                    source_url,
                )

        cur.close()

    ledger_path = public_dir / "number-ledger.csv"
    with ledger_path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(asdict(rows[0]).keys()))
        writer.writeheader()
        writer.writerows(asdict(row) for row in rows)

    manifest_path = public_dir / "source-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    gate_rows = [row for row in rows if row.release_gate]
    failures = [row for row in gate_rows if row.status == "FAIL"]
    section_counts = defaultdict(lambda: {"checks": 0, "failures": 0})
    for row in gate_rows:
        section_counts[row.section]["checks"] += 1
        section_counts[row.section]["failures"] += int(row.status == "FAIL")

    release_summaries = []
    for key, official in expectations.items():
        fiscal_year, stage = key.split("|")
        matching = [row for row in gate_rows if row.release == fiscal_year and row.stage == stage]
        release_summaries.append({
            "fiscalYear": fiscal_year,
            "stage": stage,
            "label": official["label"],
            "status": "PASS" if all(row.status == "PASS" for row in matching) else "FAIL",
            "checks": len(matching),
            "failures": sum(row.status == "FAIL" for row in matching),
            "netOperatingCents": str(official["headlines"]["net_operating_cents"]),
            "capitalCents": str(official["headlines"]["capital_cents"]),
            "totalBudgetCents": str(official["headlines"]["total_budget_cents"]),
            "employees": official["headlines"]["employees"],
            "sourcePage": official["headline_page"],
            "sourceUrl": official["budget_in_brief_url"],
        })

    summary = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "gate": {
            "status": "PASS" if not failures else "FAIL",
            "checks": len(gate_rows),
            "passed": len(gate_rows) - len(failures),
            "failures": len(failures),
            "exactMonetaryVarianceCents": str(sum(
                abs(Decimal(row.difference or "0"))
                for row in gate_rows if row.unit == "cents"
            )),
            "toleranceCents": 0,
        },
        "releases": release_summaries,
        "coverage": [
            {
                "family": section,
                "checks": counts["checks"],
                "status": "PASS" if counts["failures"] == 0 else "FAIL",
                "failures": counts["failures"],
            }
            for section, counts in sorted(section_counts.items())
        ],
        "sources": manifest,
        "knownNotes": [
            {
                "title": "The proposal restates the adopted workforce baseline",
                "detail": (
                    "The FY 2025-26 adopted Budget in Brief reports 31,996 positions. "
                    "The FY 2026-27 proposal reports a restated FY 2025-26 baseline "
                    "of 31,998. Comparison views use the restated baseline; adopted "
                    "views retain the originally published adopted figure."
                ),
                "status": "DOCUMENTED",
            },
            {
                "title": "Published allocation and revenue percentages are rounded",
                "detail": (
                    "The source publications warn that totals may not sum due to "
                    "rounding. Dollar amounts and millage rates are exact audit gates; "
                    "published percentages are verified as printed."
                ),
                "status": "DOCUMENTED",
            },
        ],
        "downloads": {
            "ledgerCsv": "/audit/number-ledger.csv",
            "sourceManifest": "/audit/source-manifest.json",
            "workbook": "/audit/budget-number-audit.xlsx",
        },
    }
    site_data_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (public_dir / "audit-summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )
    return summary
