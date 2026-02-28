"""Extract revenue source data from the Budget in Brief PDF.

Page 3 (index 3) has a multi-year revenue table with FY 2021-22 through
FY 2025-26. We extract the FY 2025-26 column (the last amount column).

The table has 7 revenue sources plus totals.
"""

import re

import pdfplumber


# Page 3 (0-indexed) has the revenue table
REVENUE_PAGE = 3

REVENUE_TABLE_SETTINGS = {
    "vertical_strategy": "text",
    "horizontal_strategy": "text",
}

# Revenue source names and their canonical forms
REVENUE_SOURCES = {
    "PROPRIETARY": "Proprietary",
    "FEDERAL & STATE": "Federal and State Grants",
    "PROPERTY TAX": "Property Tax",
    "SALES TAX": "Sales Tax",
    "GAS TAX": "Gas Tax",
    "MISC. STATE": "Misc. State Revenues",
    "MISCELLANEOUS": "Miscellaneous",
}


def extract_revenue(pdf_path: str) -> list[dict]:
    """Extract FY 2025-26 revenue source data from the Budget in Brief PDF.

    Parses the multi-year table on page 3 and extracts the rightmost
    (FY 2025-26) amount and percentage columns.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with {source, amount, percentage} for each revenue source.
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        if REVENUE_PAGE >= len(pdf.pages):
            return results

        page = pdf.pages[REVENUE_PAGE]
        tables = page.extract_tables(REVENUE_TABLE_SETTINGS)

        if not tables:
            return results

        table = tables[0]  # The main table
        results = _parse_revenue_table(table)

    # Filter out metadata entries (like _total_employees)
    return [r for r in results if not r["source"].startswith("_")]


def _parse_revenue_table(table: list[list[str]]) -> list[dict]:
    """Parse the multi-year revenue table, extracting FY 2025-26 data.

    The table has source names in column 0 and the FY 2025-26 amount
    in the second-to-last column (index -2) and percentage in the last
    column (index -1).
    """
    results = []
    pending_source = None

    for row in table:
        if not row:
            continue

        # Clean up cells
        cells = [str(c).strip() if c else "" for c in row]
        first_cell = cells[0].upper()

        # Check if this row starts a revenue source
        matched_source = None
        for pattern, canonical in REVENUE_SOURCES.items():
            if first_cell.startswith(pattern):
                matched_source = canonical
                break

        if matched_source:
            # Check if this row also has the FY 2025-26 amount
            # FY 2025-26 is in the second-to-last non-empty column
            fy2526_amount = _find_fy2526_amount(cells)
            fy2526_pct = _find_fy2526_pct(cells)

            if fy2526_amount:
                results.append({
                    "source": matched_source,
                    "amount": fy2526_amount,
                    "percentage": fy2526_pct or "",
                })
                pending_source = None
            else:
                # Multi-row source name (e.g., "FEDERAL & STATE" then "GRANTS")
                pending_source = matched_source

        elif pending_source:
            # This row might have the amounts for the previous source
            fy2526_amount = _find_fy2526_amount(cells)
            fy2526_pct = _find_fy2526_pct(cells)
            if fy2526_amount:
                results.append({
                    "source": pending_source,
                    "amount": fy2526_amount,
                    "percentage": fy2526_pct or "",
                })
                pending_source = None

        # Check for TOTAL row to extract employee count and total
        if first_cell.startswith("TOTAL EMPLOYEES"):
            total_employees = None
            for cell in reversed(cells):
                if cell and re.match(r"[\d,]+$", cell):
                    total_employees = cell
                    break
            if total_employees:
                results.append({
                    "source": "_total_employees",
                    "amount": total_employees,
                    "percentage": "",
                })

    return results


def _find_fy2526_amount(cells: list[str]) -> str | None:
    """Find the FY 2025-26 dollar amount in a row.

    Looks for dollar amounts in the last few columns.
    The FY 2025-26 column is typically at index 10 in this table.
    """
    # Search from right side for a dollar amount
    for i in range(len(cells) - 1, max(len(cells) - 4, -1), -1):
        cell = cells[i]
        if cell and re.match(r"\$[\d,]+", cell):
            return cell
    return None


def _find_fy2526_pct(cells: list[str]) -> str | None:
    """Find the FY 2025-26 percentage in a row.

    The percentage is in the last column.
    """
    if cells and cells[-1]:
        cell = cells[-1].strip()
        if re.match(r"\d{1,3}$", cell):
            return cell
    return None
