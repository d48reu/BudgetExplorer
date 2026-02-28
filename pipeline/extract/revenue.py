"""Extract revenue source data from the Budget in Brief PDF.

The revenue section shows where the county's money comes from,
broken down by 7 source categories (Property Tax, Proprietary,
Sales Tax, etc.) with dollar amounts and percentages.

Page numbers and bounding boxes must be determined by running
inspect_pdf() first and examining the debug images.
"""

import pdfplumber

from pipeline.config import DEBUG

# TODO: Update after running inspect_pdf() on the actual PDF.
REVENUE_PAGES = []  # 0-indexed page numbers
REVENUE_BBOX = None  # (x0, top, x1, bottom) or None

REVENUE_TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance": 3,
    "intersection_tolerance": 3,
}

# Known revenue source names for matching
KNOWN_REVENUE_SOURCES = {
    "Property Tax",
    "Property Taxes",
    "Proprietary",
    "Proprietary Revenue",
    "Sales Tax",
    "Sales Taxes",
    "Federal and State Grants",
    "Federal & State Grants",
    "Grants",
    "Miscellaneous",
    "Misc. State Revenues",
    "Miscellaneous State Revenues",
    "Gas Tax",
    "Gas Taxes",
}


def extract_revenue(pdf_path: str) -> list[dict]:
    """Extract revenue source data from the Budget in Brief PDF.

    Each returned dict contains:
        - source: Revenue source name (e.g., 'Property Tax')
        - amount: Raw dollar string from PDF
        - percentage: Raw percentage string from PDF (e.g., '33.1%')

    Returns raw string values. The transform module handles conversion.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with revenue source data.
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        pages_to_search = (
            [pdf.pages[p] for p in REVENUE_PAGES]
            if REVENUE_PAGES
            else pdf.pages
        )

        for page in pages_to_search:
            target = page.crop(REVENUE_BBOX) if REVENUE_BBOX else page

            if DEBUG:
                try:
                    im = target.to_image(resolution=150)
                    im.debug_tablefinder(REVENUE_TABLE_SETTINGS)
                    im.save(f"debug_revenue_p{page.page_number}.png")
                except Exception:
                    pass

            tables = target.extract_tables(REVENUE_TABLE_SETTINGS)

            for table in tables:
                parsed = _parse_revenue_table(table)
                if parsed:
                    results.extend(parsed)

    return results


def _parse_revenue_table(table: list[list[str]]) -> list[dict]:
    """Parse a raw pdfplumber table into revenue source dicts.

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

        # Check if this row matches a known revenue source
        matched_source = None
        for source in KNOWN_REVENUE_SOURCES:
            if source.lower() in cell_text.lower():
                matched_source = _normalize_revenue_source(cell_text)
                break

        if matched_source:
            entry = {"source": matched_source}

            if len(row) >= 2 and row[1]:
                entry["amount"] = str(row[1]).strip()
            if len(row) >= 3 and row[2]:
                entry["percentage"] = str(row[2]).strip()

            results.append(entry)

    return results


def _normalize_revenue_source(name: str) -> str:
    """Normalize revenue source names to match the canonical names in the schema.

    Args:
        name: Raw revenue source name from PDF.

    Returns:
        Canonical revenue source name.
    """
    name = name.strip()
    normalizations = {
        "Property Taxes": "Property Tax",
        "Sales Taxes": "Sales Tax",
        "Federal & State Grants": "Federal and State Grants",
        "Grants": "Federal and State Grants",
        "Proprietary Revenue": "Proprietary",
        "Gas Taxes": "Gas Tax",
        "Miscellaneous State Revenues": "Misc. State Revenues",
    }
    return normalizations.get(name, name)
