"""Extract operating expenditure data from Appendix C PDF.

Parses the 22-page Appendix C (Expenditures by Category of Spending)
from the Miami-Dade County Adopted Budget. Values are in thousands.

Returns department-level operating budgets across 5 fiscal years,
strategic area totals, grand total, and interagency transfers.
"""

import logging
import re
import pdfplumber

logger = logging.getLogger(__name__)


# Area names as they appear in Appendix C total lines, mapped to DB names.
# Order matters: this is the sequence areas appear in the PDF.
AREA_TOTAL_PATTERNS = [
    (r"Policy Formulation\s+Total", "Policy Formulation"),
    (r"Public Safety\s+Total", "Public Safety"),
    (r"Transportation and Mobility\s+Tot(?:al)?", "Transportation & Mobility"),
    (r"Recreation and Culture\s+Total", "Recreation & Culture"),
    (r"Neighborhood and Infrastructure(?:\s+Total)?", "Neighborhood & Infrastructure"),
    (r"Health and Society\s+Total", "Health & Society"),
    (r"Economic Development\s+Total", "Economic Development"),
    (r"General Government\s+Total", "General Government"),
    (r"Constitutional Office\s+Total", "Constitutional Offices"),
]

# The order areas appear in the PDF (DB-normalized names)
AREA_ORDER = [name for _, name in AREA_TOTAL_PATTERNS]

# Spending category prefixes to skip (detail lines, not totals)
SPENDING_CATEGORIES = (
    "Salary",
    "Fringe Benefits",
    "Court Costs",
    "Contractual Services",
    "Other Operating",
    "Charges for County Services",
    "Grants to Outside Organizations",
    "Capital ",  # trailing space to avoid matching "Capital" in dept names
)

# Header/footer lines to skip
SKIP_PATTERNS = (
    "APPENDIX C",
    "Expenditures by Category",
    "(Dollars in thousands)",
    "Strategic Area / Department",
    "21-22",
    "All Strategic Areas",
)


def _extract_numbers(text: str) -> list[str]:
    """Extract all comma-separated numbers from a string."""
    return re.findall(r"[\d,]+", text)


def _is_skip_line(line: str) -> bool:
    """Check if a line is a header, footer, or empty."""
    if not line or not line.strip():
        return True
    stripped = line.strip()
    # Page numbers (just digits, 2-3 chars)
    if re.match(r"^\d{2,3}$", stripped):
        return True
    for pat in SKIP_PATTERNS:
        if stripped.startswith(pat):
            return True
    return False


def _is_spending_category(line: str) -> bool:
    """Check if a line is a spending category detail line."""
    stripped = line.strip()
    for cat in SPENDING_CATEGORIES:
        if stripped.startswith(cat):
            return True
    # "Capital" without trailing space -- check it has numbers after
    if stripped.startswith("Capital") and re.search(r"\d", stripped):
        # But skip "Capital" if it's just the word alone (department name context)
        rest = stripped[7:].strip()
        if rest and rest[0].isdigit() or rest.startswith("-"):
            return True
    return False


def _match_area_total(line: str):
    """Check if line is a strategic area total. Returns (area_name, values) or None."""
    stripped = line.strip()
    for pattern, normalized_name in AREA_TOTAL_PATTERNS:
        m = re.match(rf"^{pattern}\s+(.*)", stripped)
        if m:
            rest = m.group(1)
            numbers = _extract_numbers(rest)
            if len(numbers) >= 5:
                return normalized_name, numbers[:5]
    return None


def extract_appendix_c(pdf_path: str) -> dict:
    """Parse Appendix C and extract operating expenditure data.

    Args:
        pdf_path: Path to the Appendix C PDF file.

    Returns:
        Dict with keys:
            departments: list of dicts with strategic_area, department,
                actual_21_22 through adopted_25_26, positions_25_26
            area_totals: list of dicts per strategic area
            grand_total: the net operating total string (thousands)
            interagency_transfers: the interagency adjustment string (thousands)
            total_employees: total position count string
    """
    # Extract all text, page by page
    all_lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                all_lines.extend(text.split("\n"))

    departments = []
    area_totals = []
    grand_total = None
    interagency_transfers = None
    total_employees = None

    current_area = AREA_ORDER[0]  # starts with Policy Formulation
    area_index = 0
    current_dept = None

    for line in all_lines:
        stripped = line.strip()

        if _is_skip_line(stripped):
            continue

        # Check for Grand Total (last summary line)
        if stripped.startswith("Grand Total:"):
            numbers = _extract_numbers(stripped)
            if len(numbers) >= 5:
                grand_total = numbers[4]  # FY 25-26 adopted
            continue

        # Check for interagency transfers
        if "Minus Adjustments" in stripped or "Interagency" in stripped:
            numbers = _extract_numbers(stripped)
            if len(numbers) >= 5:
                interagency_transfers = numbers[4]
            continue

        # Check for area total line
        area_match = _match_area_total(stripped)
        if area_match:
            area_name, values = area_match
            area_totals.append({
                "strategic_area": area_name,
                "actual_21_22": values[0],
                "actual_22_23": values[1],
                "actual_23_24": values[2],
                "budget_24_25": values[3],
                "adopted_25_26": values[4],
            })
            # Advance to next area
            area_index += 1
            if area_index < len(AREA_ORDER):
                current_area = AREA_ORDER[area_index]
            continue

        # Check for Department Total:
        if stripped.startswith("Department Total:"):
            numbers = _extract_numbers(stripped)
            # After the grand total section, "Department Total:" is the
            # employee grand total, not a department budget row.
            if area_index >= len(AREA_ORDER):
                if len(numbers) >= 5:
                    total_employees = numbers[4]
            elif len(numbers) >= 5 and current_dept:
                departments.append({
                    "strategic_area": current_area,
                    "department": current_dept,
                    "actual_21_22": numbers[0],
                    "actual_22_23": numbers[1],
                    "actual_23_24": numbers[2],
                    "budget_24_25": numbers[3],
                    "adopted_25_26": numbers[4],
                })
            elif current_dept:
                # A dash or blank in any year column yields fewer than 5
                # values; make the dropped department visible instead of
                # silently losing it.
                logger.warning(
                    "Appendix C: could not parse Department Total for %r "
                    "(%d of 5 values found) -- department dropped: %r",
                    current_dept, len(numbers), stripped,
                )
            continue

        # Check for Department Position Total:
        if stripped.startswith("Department Position Total:"):
            numbers = _extract_numbers(stripped)
            if len(numbers) >= 5 and departments:
                departments[-1]["positions_25_26"] = numbers[4]
            continue

        # Skip spending category detail lines
        if _is_spending_category(stripped):
            continue

        # Remaining lines are department names
        # Department names have no numbers (or very few from footnotes)
        numbers_in_line = _extract_numbers(stripped)
        if len(numbers_in_line) <= 1:
            # This is a department name (possibly with a footnote number)
            current_dept = stripped
            # Clean trailing footnote markers
            current_dept = re.sub(r"[\*\+]+$", "", current_dept).strip()

    return {
        "departments": departments,
        "area_totals": area_totals,
        "grand_total": grand_total,
        "interagency_transfers": interagency_transfers,
        "total_employees": total_employees,
    }
