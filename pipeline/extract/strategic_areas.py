"""Extract strategic area budget data from the Budget in Brief PDF.

Strategic areas are the 9 top-level budget categories (Public Safety,
Transportation & Mobility, etc.) with operating, capital, total budgets
and employee counts.

Page numbers and bounding boxes must be determined by running
inspect_pdf() first and examining the debug images.
"""

import pdfplumber

from pipeline.config import DEBUG

# TODO: Update after running inspect_pdf() on the actual PDF.
# These are placeholder values that must be tuned.
STRATEGIC_AREA_PAGES = []  # List of 0-indexed page numbers
STRATEGIC_AREA_BBOX = None  # (x0, top, x1, bottom) in points, or None for full page

# Table settings tuned for the strategic area summary table.
# The strategic area table typically has bordered cells.
STRATEGIC_AREA_TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance": 3,
    "intersection_tolerance": 3,
}


def extract_strategic_areas(pdf_path: str) -> list[dict]:
    """Extract strategic area budget data from the Budget in Brief PDF.

    Each returned dict contains:
        - name: Strategic area name (e.g., 'Public Safety')
        - operating_budget: Raw dollar string from PDF
        - capital_budget: Raw dollar string from PDF
        - total_budget: Raw dollar string from PDF
        - employee_count: Raw string from PDF

    Returns raw string values. The transform module handles conversion
    to cents.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with strategic area budget data.
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        pages_to_search = (
            [pdf.pages[p] for p in STRATEGIC_AREA_PAGES]
            if STRATEGIC_AREA_PAGES
            else pdf.pages
        )

        for page in pages_to_search:
            # Crop to the specific table region if bbox is defined
            target = page.crop(STRATEGIC_AREA_BBOX) if STRATEGIC_AREA_BBOX else page

            # Debug: save table detection image
            if DEBUG:
                try:
                    im = target.to_image(resolution=150)
                    im.debug_tablefinder(STRATEGIC_AREA_TABLE_SETTINGS)
                    im.save(f"debug_strategic_areas_p{page.page_number}.png")
                except Exception:
                    pass

            tables = target.extract_tables(STRATEGIC_AREA_TABLE_SETTINGS)

            for table in tables:
                parsed = _parse_strategic_area_table(table)
                if parsed:
                    results.extend(parsed)

    return results


def _parse_strategic_area_table(table: list[list[str]]) -> list[dict]:
    """Parse a raw pdfplumber table into strategic area dicts.

    Attempts to identify column headers and extract data rows.
    Skips header rows and total/summary rows.

    Args:
        table: Raw table from pdfplumber extract_tables().

    Returns:
        List of parsed dicts, or empty list if table is not recognized.
    """
    if not table or len(table) < 2:
        return []

    results = []

    # Known strategic area names for matching
    known_areas = {
        "Policy Formulation",
        "Constitutional Offices",
        "Public Safety",
        "Transportation & Mobility",
        "Transportation and Mobility",
        "Recreation & Culture",
        "Recreation and Culture",
        "Neighborhood & Infrastructure",
        "Neighborhood and Infrastructure",
        "Health & Society",
        "Health and Society",
        "Economic Development",
        "General Government",
    }

    for row in table:
        if not row or not row[0]:
            continue

        cell_text = str(row[0]).strip()

        # Check if this row contains a strategic area name
        if cell_text in known_areas:
            # Try to extract columns: name, operating, capital, total, employees
            area = {"name": cell_text}

            if len(row) >= 2 and row[1]:
                area["operating_budget"] = str(row[1]).strip()
            if len(row) >= 3 and row[2]:
                area["capital_budget"] = str(row[2]).strip()
            if len(row) >= 4 and row[3]:
                area["total_budget"] = str(row[3]).strip()
            if len(row) >= 5 and row[4]:
                area["employee_count"] = str(row[4]).strip()

            results.append(area)

    return results
