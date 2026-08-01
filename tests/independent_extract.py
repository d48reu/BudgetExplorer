"""Independent re-extraction of budget figures straight from the source PDFs.

This module exists to close a structural blind spot in the numeric audit gate.
Of the checks in ``public/audit/number-ledger.csv``, only the "independent
transcription" family compares the database against a human reading of the
published documents. The rest compare a *fresh run of the pipeline extractor*
against a database that the *same extractor* populated. That catches database
drift and load bugs, but it cannot catch a misread in the extractor itself:
a wrong number would appear identically on both sides of the comparison and
the check would pass.

The parsers here are deliberately written from scratch and MUST NOT import
anything from ``pipeline``. They reach the same figures by a different route,
so agreement between them and the ledger is real evidence rather than a
tautology. Keep that independence when editing: if a fix here starts by
consulting ``pipeline/extract``, the value of the whole test is gone.

Document layouts
----------------
Appendix C (adopted, ``Dollars in thousands``)
    Departments are listed and then closed by a ``<Strategic Area> Total``
    row, so departments accumulate into a pending list and are assigned to
    the area that closes them. Two area labels are damaged in the PDF text
    layer -- "Transportation and Mobility" is truncated to ``Tot`` and
    "Neighborhood and Infrastructure" loses the word ``Total`` entirely --
    so the trailing label is optional in AREA_RE.

Appendix J (adopted capital)
    ``Department Total`` rows carry nine columns; the 25-26 total is index 6.
    Department names are ALL CAPS, but so are the continuation lines of long
    wrapped project names, so casing alone cannot identify a header. A header
    is recognised only where the structure allows one: immediately after a
    strategic-area heading or after a ``Department Total`` row. Page furniture
    must be skipped without clearing that expectation, because a department
    heading can be the first content line on a continuation page.

Appendix A (proposed operating, Volume 1 pp.109-116)
    ``Department Total`` rows carry sixteen numbers -- eight column pairs of
    (25-26, 26-27). Total Funding is index 12/13 and Total Positions 14/15.
    Department Total Funding sums to *gross* operating; the printed Grand
    Total is *net*, after interagency transfers.

Appendix H (proposed capital, Volume 1 pp.144-145)
    One row per department under a strategic-priority heading; 2026-27 is
    column index 1.

Known source defect
-------------------
One Appendix A row (Sheriff, p.109) has three values merged into a single
token by the PDF text layer -- ``1,1461,118,0001,181,067`` is really 1,146 /
1,118,000 / 1,181,067. They are one word in the PDF, with no gap to split on,
so ``extract_words`` does not separate them either. That row is reported via
:data:`MERGED_TOKEN_ROWS` rather than guessed at, and the proposed operating
assertions reconcile totals around it instead of pretending to read it.
"""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

import pdfplumber

ADOPTED_AREAS = [
    "Policy Formulation",
    "Constitutional Offices",
    "Public Safety",
    "Transportation and Mobility",
    "Recreation and Culture",
    "Neighborhood and Infrastructure",
    "Health and Society",
    "Economic Development",
    "General Government",
]
AREA_ALIASES = {"Constitutional Office": "Constitutional Offices"}

# Rows whose numbers the PDF text layer merges into one unsplittable token.
MERGED_TOKEN_ROWS = 1

_NUMBER = re.compile(r"-?\d[\d,]*")
# "<Area> [Tot|Total] n n n n n p%" -- the label is damaged for two areas.
_AREA_TOTAL = re.compile(
    r"^(?P<name>[A-Za-z&' ]+?)\s+(?:Tot(?:al)?\s+)?"
    r"(?P<values>-?[\d,]+(?:\s+-?[\d,]+){4}\s+-?\d+%)$"
)
_APPENDIX_C_HEADINGS = {
    "APPENDIX C",
    "Expenditures by Category of Spending",
    "(Dollars in thousands)",
}
_APPENDIX_J_FURNITURE = (
    "APPENDIX J",
    "(dollars in thousands)",
    "25-26 Projected",
    "Prior Years",
)


def numbers(text: str) -> list[int]:
    """Every integer in *text*, tolerating thousands separators."""
    found = []
    for token in _NUMBER.findall(text):
        token = token.replace(",", "").rstrip("-")
        if token.lstrip("-").isdigit():
            found.append(int(token))
    return found


def canonical_area(name: str) -> str:
    name = name.replace("&", "and").strip()
    return AREA_ALIASES.get(name, name)


def extract_appendix_c(pdf_path: Path) -> tuple[dict, dict]:
    """Return ({(department, area): {operating, positions}}, {area: total})."""
    rows: dict[tuple[str, str], dict[str, int]] = {}
    area_totals: dict[str, int] = {}
    pending: list[str] = []
    staged: dict[str, dict[str, int]] = {}
    current: str | None = None

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for raw in (page.extract_text() or "").splitlines():
                line = raw.strip()
                if not line:
                    continue
                if line.startswith("Department Total:"):
                    values = numbers(line)
                    if current and len(values) >= 5:
                        staged.setdefault(current, {})["operating"] = values[4]
                    continue
                if line.startswith("Department Position Total:"):
                    values = numbers(line)
                    if current and len(values) >= 5:
                        staged.setdefault(current, {})["positions"] = values[4]
                    continue
                if line.startswith("Grand Total"):
                    continue

                match = _AREA_TOTAL.match(line)
                if match:
                    area = canonical_area(match.group("name"))
                    if area in ADOPTED_AREAS:
                        for department in pending:
                            if department in staged:
                                rows[(department, area)] = staged.pop(department)
                        area_totals[area] = numbers(match.group("values"))[4]
                        pending, current = [], None
                        continue

                if not re.search(r"\d", line):
                    if line in _APPENDIX_C_HEADINGS:
                        continue
                    if canonical_area(line) in ADOPTED_AREAS:
                        continue
                    current = line
                    if line not in pending:
                        pending.append(line)
    return rows, area_totals


def extract_appendix_j(pdf_path: Path) -> dict[tuple[str, str], int]:
    """Return {(department, area): capital_thousands} for the adopted year."""
    rows: dict[tuple[str, str], int] = {}
    area: str | None = None
    department: str | None = None
    expect_department = False

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for raw in (page.extract_text() or "").splitlines():
                line = raw.strip()
                if not line or line.startswith(_APPENDIX_J_FURNITURE):
                    continue
                if line.startswith("-") or line.isdigit():
                    continue  # rules and page numbers
                if line.startswith("Department Total"):
                    values = numbers(line)
                    if area and department and len(values) >= 7:
                        key = (department, area)
                        rows[key] = rows.get(key, 0) + values[6]
                    expect_department = True
                    continue
                if line.startswith("Grand Total"):
                    continue
                if re.search(r"\d", line):
                    expect_department = False
                    continue
                if canonical_area(line) in ADOPTED_AREAS:
                    area, department = canonical_area(line), None
                    expect_department = True
                    continue
                if expect_department and line.isupper() and len(line) > 2:
                    department = line
                    expect_department = False
    return rows


def extract_appendix_a(pdf_path: Path, pages=range(109, 117)) -> dict:
    """Totals from the proposed Appendix A ``Department Total`` rows.

    Returns gross sums, the printed Grand Total, and the count of rows whose
    values the text layer merged into an unsplittable token.
    """
    gross = {"operating_25_26": 0, "operating_26_27": 0,
             "positions_25_26": 0, "positions_26_27": 0}
    grand: dict[str, int] = {}
    merged = 0

    with pdfplumber.open(pdf_path) as pdf:
        for number in pages:
            for raw in (pdf.pages[number - 1].extract_text() or "").splitlines():
                line = raw.strip()
                if line.startswith("Grand Total"):
                    values = numbers(line)
                    if len(values) >= 4:
                        grand = {
                            "operating_25_26": values[-4],
                            "operating_26_27": values[-3],
                            "positions_25_26": values[-2],
                            "positions_26_27": values[-1],
                        }
                    continue
                if not line.startswith("Department Total"):
                    continue
                values = numbers(line)
                # positions are always the final pair, even on a damaged row
                if len(values) >= 2:
                    gross["positions_25_26"] += values[-2]
                    gross["positions_26_27"] += values[-1]
                if len(values) == 16:
                    gross["operating_25_26"] += values[12]
                    gross["operating_26_27"] += values[13]
                else:
                    merged += 1
    return {"gross": gross, "grand_total": grand, "merged_rows": merged}


def extract_appendix_h(pdf_path: Path, pages=(144, 145)) -> tuple[dict, dict, dict]:
    """Return (rows, area_totals, grand_total) for proposed capital."""
    rows: dict[tuple[str, str], int] = {}
    area_totals: dict[str, int] = defaultdict(int)
    grand: dict[str, int] = {}
    area: str | None = None
    title_case = re.compile(r"^[A-Z][A-Za-z].*[a-z]$")

    with pdfplumber.open(pdf_path) as pdf:
        for number in pages:
            for raw in (pdf.pages[number - 1].extract_text() or "").splitlines():
                line = raw.strip()
                if not line or line.startswith(
                    ("APPENDIX", "(dollars", "Strategic Priority /")
                ):
                    continue
                if line.startswith("Strategic Priorities Total"):
                    values = numbers(line)
                    if area and len(values) >= 2:
                        area_totals[area] += values[1]
                    continue
                if line.startswith("Grand Total"):
                    values = numbers(line)
                    if len(values) >= 2:
                        grand = {"capital_26_27": values[1]}
                    continue
                values = numbers(line)
                if not values:
                    if title_case.match(line) and not line.isupper():
                        area = line
                    continue
                name = _NUMBER.split(line)[0].strip()
                if name and area and len(values) >= 9:
                    key = (name, area)
                    rows[key] = rows.get(key, 0) + values[1]
    return rows, dict(area_totals), grand
