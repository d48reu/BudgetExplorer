"""Coordinate-aware extraction for the FY 2026-27 proposed budget.

Appendix A uses paired FY 2025-26/FY 2026-27 columns and Appendix H contains
wrapped department names. Fixed cell boundaries are intentional: plain text
extraction merges the Sheriff's Office funding cells and is not trustworthy.
"""

from __future__ import annotations

import re
import unicodedata
from collections import defaultdict

import pdfplumber


PROPOSED_BIB_URL = (
    "https://www.miamidade.gov/resources/budget/fy-26-27/proposed/"
    "budget-in-brief.pdf"
)
PROPOSED_VOLUME_1_URL = (
    "https://www.miamidade.gov/resources/budget/fy-26-27/proposed/"
    "volume-1-bookmarks.pdf"
)
PROPOSED_VOLUME_2_URL = (
    "https://www.miamidade.gov/resources/budget/fy-26-27/proposed/"
    "volume-2-bookmarks.pdf"
)
PROPOSED_VOLUME_3_URL = (
    "https://www.miamidade.gov/resources/budget/fy-26-27/proposed/"
    "volume-3-bookmarks.pdf"
)

APPENDIX_A_PAGES = range(108, 116)  # zero-based PDF pages 109-116
APPENDIX_H_PAGES = (143, 144)       # zero-based PDF pages 144-145
APPENDIX_A_TOTAL_CELLS = ((468, 494), (494, 520), (520, 546), (546, 572))
APPENDIX_H_PROPOSED_CELL = (244, 286)

PRIORITY_ALIASES = {
    "Constitutional Office": "Constitutional Offices",
}

PRIORITY_METADATA = (
    {
        "name": "Policy Formulation",
        "slug": "policy-formulation",
        "display_order": 1,
        "cents_per_dollar": 1,
        "color": "#0057B8",
        "description": "Sets countywide policy and responds to community priorities.",
    },
    {
        "name": "Constitutional Offices",
        "slug": "constitutional-offices",
        "display_order": 2,
        "cents_per_dollar": 15,
        "color": "#6F2DA8",
        "description": "County offices established by the Florida Constitution.",
    },
    {
        "name": "An Economy that Works for All",
        "slug": "economy-that-works-for-all",
        "display_order": 3,
        "cents_per_dollar": 19,
        "color": "#007F5F",
        "description": "Supports an affordable, resilient, and broadly shared economy.",
    },
    {
        "name": "Healthy and Safe Communities",
        "slug": "healthy-and-safe-communities",
        "display_order": 4,
        "cents_per_dollar": 34,
        "color": "#C44536",
        "description": "Prioritizes health, safety, and community well-being.",
    },
    {
        "name": "Investment in Infrastructure",
        "slug": "investment-in-infrastructure",
        "display_order": 5,
        "cents_per_dollar": 25,
        "color": "#E07A00",
        "description": "Builds and maintains infrastructure for long-term growth.",
    },
    {
        "name": "Risk Reduction and Resilience",
        "slug": "risk-reduction-and-resilience",
        "display_order": 6,
        "cents_per_dollar": 1,
        "color": "#278090",
        "description": "Reduces risk and safeguards natural and built environments.",
    },
    {
        "name": "Fiscal Responsibility and Efficiency",
        "slug": "fiscal-responsibility-and-efficiency",
        "display_order": 7,
        "cents_per_dollar": 5,
        "color": "#5F6B7A",
        "description": "Maximizes public resources and improves government efficiency.",
    },
)

REVENUE = (
    ("Proprietary", 3_925_180_000, 44),
    ("Federal and State Grants", 358_457_000, 4),
    ("Property Tax", 3_297_900_000, 37),
    ("Sales Tax", 494_146_000, 5),
    ("Gas Tax", 66_315_000, 1),
    ("Misc. State Revenues", 154_855_000, 2),
    ("Miscellaneous", 724_823_000, 8),
)

MILLAGE = (
    ("Countywide Operating", "4.5740", True),
    ("UMSA Operating", "1.9090", True),
    ("Fire Rescue Operating", "2.3965", True),
    ("Library System", "0.2812", True),
    ("Countywide Debt Service", "0.3937", True),
    ("Total to County", "9.5544", True),
    (
        "Other (School Board and regional authorities)",
        "7.3539",
        False,
    ),
)


def _canonical_priority(name: str) -> str:
    return PRIORITY_ALIASES.get(name, name)


def _parse_int(text: str) -> int:
    digits = re.sub(r"[^0-9-]", "", text or "")
    return int(digits) if digits and digits != "-" else 0


def _cell_int(page, top: float, bounds: tuple[int, int]) -> int:
    text = page.crop(
        (bounds[0], top - 1, bounds[1], top + 9)
    ).extract_text(x_tolerance=1, y_tolerance=1)
    return _parse_int(text or "")


def _group_lines(page):
    words = page.extract_words(
        x_tolerance=1,
        y_tolerance=2,
        extra_attrs=["fontname"],
    )
    lines = defaultdict(list)
    for word in words:
        lines[round(word["top"], 1)].append(word)
    return sorted(lines.items())


def extract_appendix_a(volume_1_path: str) -> list[dict]:
    """Extract department gross operating totals and positions."""
    rows = []
    current_priority = None
    current_department = None

    with pdfplumber.open(volume_1_path) as pdf:
        for page_index in APPENDIX_A_PAGES:
            page = pdf.pages[page_index]
            for top, words in _group_lines(page):
                if top < 100:
                    continue
                left = sorted(
                    (word for word in words if word["x0"] < 160),
                    key=lambda word: word["x0"],
                )
                if not left:
                    continue
                text = " ".join(word["text"] for word in left)
                bold = all("Bold" in word["fontname"] for word in left)

                if text.startswith("Strategic Priority:"):
                    current_priority = _canonical_priority(
                        text.split(":", 1)[1].strip()
                    )
                    continue

                if bold and text.startswith("Department Total"):
                    if not current_priority or not current_department:
                        raise ValueError(
                            f"Appendix A orphan department total on page {page_index + 1}"
                        )
                    values = [
                        _cell_int(page, top, bounds)
                        for bounds in APPENDIX_A_TOTAL_CELLS
                    ]
                    rows.append({
                        "priority": current_priority,
                        "department": current_department,
                        "adopted_operating_thousands": values[0],
                        "proposed_operating_thousands": values[1],
                        "adopted_positions": values[2],
                        "proposed_positions": values[3],
                        "source_page": page_index + 1,
                    })
                    continue

                if bold and text.endswith(" Total"):
                    continue

                if bold and text not in {"Department", "Primary Activity"}:
                    current_department = text

    return rows


def _display_department_name(name: str) -> str:
    words = name.title()
    words = re.sub(r"\bAnd\b", "and", words)
    words = words.replace("Sheriff'S", "Sheriff's")
    return words


def extract_appendix_h(volume_1_path: str) -> tuple[list[dict], dict[str, int]]:
    """Extract FY 2026-27 capital by priority and department."""
    rows = []
    totals = {}
    current_priority = None
    pending = None

    with pdfplumber.open(volume_1_path) as pdf:
        for page_index in APPENDIX_H_PAGES:
            page = pdf.pages[page_index]
            for top, words in _group_lines(page):
                if top < 80:
                    continue
                left = sorted(
                    (word for word in words if word["x0"] < 200),
                    key=lambda word: word["x0"],
                )
                if not left:
                    continue
                text = " ".join(word["text"] for word in left)
                bold = all("Bold" in word["fontname"] for word in left)
                has_proposed_value = any(
                    APPENDIX_H_PROPOSED_CELL[0] <= word["x0"]
                    < APPENDIX_H_PROPOSED_CELL[1]
                    for word in words
                )

                if bold and text.startswith("Strategic Priorities Total"):
                    if pending:
                        rows.append(pending)
                        pending = None
                    totals[current_priority] = _cell_int(
                        page, top, APPENDIX_H_PROPOSED_CELL
                    )
                    continue

                if bold and not has_proposed_value:
                    if text == "Strategic Priority / Department":
                        continue
                    if pending:
                        rows.append(pending)
                        pending = None
                    current_priority = _canonical_priority(text)
                    continue

                if has_proposed_value and not bold:
                    if pending:
                        rows.append(pending)
                    pending = {
                        "priority": current_priority,
                        "department": _display_department_name(text),
                        "proposed_capital_thousands": _cell_int(
                            page, top, APPENDIX_H_PROPOSED_CELL
                        ),
                        "source_page": page_index + 1,
                    }
                elif not bold and pending:
                    pending["department"] += " " + _display_department_name(text)

        if pending:
            rows.append(pending)

    return rows, totals


def _department_key(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized.lower()).strip()
    return re.sub(r" department$", "", normalized)


def _extract_release_totals(bib_path: str) -> tuple[int, int, int, int]:
    with pdfplumber.open(bib_path) as pdf:
        overview = pdf.pages[2].extract_text(x_tolerance=2, y_tolerance=2) or ""
        sources = pdf.pages[3].extract_text(x_tolerance=2, y_tolerance=2) or ""

    def amount(pattern: str) -> int:
        match = re.search(pattern, overview, flags=re.DOTALL)
        if not match:
            raise ValueError(f"Budget in Brief total not found: {pattern}")
        return _parse_int(match.group(1))

    total = amount(r"TOTAL OPERATING AND\s+CAPITAL BUDGET\s+\$([0-9,]+)")
    capital = amount(r"CAPITAL\s+\$([0-9,]+)")
    operating = amount(r"OPERATING\s+\$([0-9,]+)")
    employee_line = next(
        line for line in sources.splitlines()
        if line.strip().startswith("TOTAL EMPLOYEES")
    )
    positions = _parse_int(re.findall(r"[0-9][0-9,]*", employee_line)[-1])
    return operating, capital, total, positions


def extract_proposed_budget(bib_path: str, volume_1_path: str) -> dict:
    """Extract and reconcile the FY 2026-27 proposed budget dataset."""
    operating_rows = extract_appendix_a(volume_1_path)
    capital_rows, capital_totals = extract_appendix_h(volume_1_path)
    operating, capital, total, positions = _extract_release_totals(bib_path)

    canonical_departments = {
        _department_key(row["department"]): row["department"]
        for row in operating_rows
    }
    merged = {}
    for row in operating_rows:
        key = (row["priority"], _department_key(row["department"]))
        merged[key] = {
            "priority": row["priority"],
            "department": row["department"],
            "operating_cents": row["proposed_operating_thousands"] * 100_000,
            "capital_cents": 0,
            "employee_count": row["proposed_positions"],
            "restated_adopted_operating_cents": (
                row["adopted_operating_thousands"] * 100_000
            ),
            "restated_adopted_positions": row["adopted_positions"],
            "operating_source_page": row["source_page"],
            "capital_source_page": None,
        }

    for row in capital_rows:
        department_key = _department_key(row["department"])
        key = (row["priority"], department_key)
        budget = merged.setdefault(key, {
            "priority": row["priority"],
            "department": canonical_departments.get(
                department_key, row["department"]
            ),
            "operating_cents": 0,
            "capital_cents": 0,
            "employee_count": None,
            "restated_adopted_operating_cents": 0,
            "restated_adopted_positions": None,
            "operating_source_page": None,
            "capital_source_page": None,
        })
        budget["capital_cents"] += row["proposed_capital_thousands"] * 100_000
        budget["capital_source_page"] = row["source_page"]

    budgets = list(merged.values())
    order = {item["name"]: item["display_order"] for item in PRIORITY_METADATA}
    budgets.sort(key=lambda row: (order[row["priority"]], row["department"]))
    for budget in budgets:
        budget["total_budget_cents"] = (
            budget["operating_cents"] + budget["capital_cents"]
        )

    gross_operating = sum(row["operating_cents"] for row in budgets)
    extracted_capital = sum(row["capital_cents"] for row in budgets)
    extracted_positions = sum(
        row["employee_count"] or 0 for row in budgets
        if row["operating_source_page"] is not None
    )
    restated_operating = sum(
        row["restated_adopted_operating_cents"] for row in budgets
    )
    restated_positions = sum(
        row["restated_adopted_positions"] or 0 for row in budgets
        if row["operating_source_page"] is not None
    )

    if extracted_capital != capital * 100:
        raise ValueError(
            f"Appendix H capital {extracted_capital} does not match BIB {capital * 100}"
        )
    if extracted_positions != positions:
        raise ValueError(
            f"Appendix A positions {extracted_positions} does not match BIB {positions}"
        )
    if operating + capital != total:
        raise ValueError("Budget in Brief operating + capital does not equal total")

    priorities = []
    for metadata in PRIORITY_METADATA:
        name = metadata["name"]
        priority = dict(metadata)
        priority["operating_cents"] = sum(
            row["operating_cents"] for row in budgets if row["priority"] == name
        )
        priority["capital_cents"] = sum(
            row["capital_cents"] for row in budgets if row["priority"] == name
        )
        expected_capital = capital_totals.get(name, 0) * 100_000
        if priority["capital_cents"] != expected_capital:
            raise ValueError(f"Capital priority total mismatch for {name}")
        priorities.append(priority)

    return {
        "format": "proposed-budget-v1",
        "fiscal_year": "FY 2026-27",
        "stage": "proposed",
        "release": {
            "as_of_date": "2026-07-15",
            "operating_cents": operating * 100,
            "gross_operating_cents": gross_operating,
            "interagency_transfers_cents": gross_operating - (operating * 100),
            "capital_cents": capital * 100,
            "total_cents": total * 100,
            "employees": positions,
            "budget_in_brief_url": PROPOSED_BIB_URL,
            "volume_1_url": PROPOSED_VOLUME_1_URL,
            "volume_2_url": PROPOSED_VOLUME_2_URL,
            "volume_3_url": PROPOSED_VOLUME_3_URL,
        },
        "restated_adopted_baseline": {
            "gross_operating_cents": restated_operating,
            "employees": restated_positions,
        },
        "priorities": priorities,
        "department_budgets": budgets,
        "revenue": [
            {
                "source": source,
                "amount": f"${amount:,}",
                "percentage": str(percentage),
            }
            for source, amount, percentage in REVENUE
        ],
        "millage": [
            {
                "authority": authority,
                "millage_rate": rate,
                "is_county": is_county,
            }
            for authority, rate, is_county in MILLAGE
        ],
    }


def proposed_verification_totals(data: dict) -> dict:
    """Build the verifier sidecar from an extracted proposed dataset."""
    release = data["release"]
    return {
        "fiscal_year": data["fiscal_year"],
        "stage": "proposed",
        "gross_operating_cents": release["gross_operating_cents"],
        "interagency_transfers_cents": release["interagency_transfers_cents"],
        "operating_cents": release["operating_cents"],
        "capital_cents": release["capital_cents"],
        "total_budget_cents": release["total_cents"],
        "total_employees": release["employees"],
        "strategic_areas": [
            {
                "name": priority["name"],
                "slug": priority["slug"],
                "operating_cents": priority["operating_cents"],
            }
            for priority in data["priorities"]
        ],
    }
