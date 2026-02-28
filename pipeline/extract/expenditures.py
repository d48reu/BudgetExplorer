"""Extract expenditure category data from the Budget in Brief PDF.

The expenditure section shows how the county spends its money,
broken down by categories (Salary, Fringes, Contractual Services,
etc.) with dollar amounts and percentages.

Page numbers and bounding boxes must be determined by running
inspect_pdf() first and examining the debug images.
"""

import pdfplumber

from pipeline.config import DEBUG

# TODO: Update after running inspect_pdf() on the actual PDF.
EXPENDITURE_PAGES = []  # 0-indexed page numbers
EXPENDITURE_BBOX = None  # (x0, top, x1, bottom) or None

EXPENDITURE_TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance": 3,
    "intersection_tolerance": 3,
}

# Known expenditure category names for matching
KNOWN_CATEGORIES = {
    "Salary",
    "Salaries",
    "Fringes",
    "Fringe Benefits",
    "Contractual Services",
    "Other Operating Costs",
    "Other Operating",
    "Charges for County Services",
    "Grants to Outside Organizations",
    "Capital",
    "Court Costs",
    "Interagency Transfers",
}


def extract_expenditures(pdf_path: str) -> list[dict]:
    """Extract expenditure category data from the Budget in Brief PDF.

    Each returned dict contains:
        - category: Expenditure category name (e.g., 'Salary')
        - amount: Raw dollar string from PDF
        - percentage: Raw percentage string from PDF

    Returns raw string values. The transform module handles conversion.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with expenditure category data.
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        pages_to_search = (
            [pdf.pages[p] for p in EXPENDITURE_PAGES]
            if EXPENDITURE_PAGES
            else pdf.pages
        )

        for page in pages_to_search:
            target = page.crop(EXPENDITURE_BBOX) if EXPENDITURE_BBOX else page

            if DEBUG:
                try:
                    im = target.to_image(resolution=150)
                    im.debug_tablefinder(EXPENDITURE_TABLE_SETTINGS)
                    im.save(f"debug_expenditures_p{page.page_number}.png")
                except Exception:
                    pass

            tables = target.extract_tables(EXPENDITURE_TABLE_SETTINGS)

            for table in tables:
                parsed = _parse_expenditure_table(table)
                if parsed:
                    results.extend(parsed)

    return results


def _parse_expenditure_table(table: list[list[str]]) -> list[dict]:
    """Parse a raw pdfplumber table into expenditure category dicts.

    Args:
        table: Raw table from pdfplumber extract_tables().

    Returns:
        List of parsed dicts, or empty list if table is not recognized.
    """
    if not table or len(table) < 2:
        return []

    results = []

    for row in table:
        if not row or not row[0]:
            continue

        cell_text = str(row[0]).strip()

        # Check if this row matches a known expenditure category
        matched_category = None
        for category in KNOWN_CATEGORIES:
            if category.lower() in cell_text.lower():
                matched_category = _normalize_category(cell_text)
                break

        if matched_category:
            entry = {"category": matched_category}

            if len(row) >= 2 and row[1]:
                entry["amount"] = str(row[1]).strip()
            if len(row) >= 3 and row[2]:
                entry["percentage"] = str(row[2]).strip()

            results.append(entry)

    return results


def _normalize_category(name: str) -> str:
    """Normalize expenditure category names to match schema.

    Args:
        name: Raw category name from PDF.

    Returns:
        Canonical category name.
    """
    name = name.strip()
    normalizations = {
        "Salaries": "Salary",
        "Fringe Benefits": "Fringes",
        "Other Operating": "Other Operating Costs",
    }
    return normalizations.get(name, name)
