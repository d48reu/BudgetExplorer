"""Extract millage rate data from the Budget in Brief PDF.

The millage section shows property tax rates by taxing authority.
County authorities (Countywide Operating, UMSA, Fire, Library, etc.)
are distinguished from non-county authorities (School Board,
Children's Trust, etc.).

Page numbers and bounding boxes must be determined by running
inspect_pdf() first and examining the debug images.
"""

import pdfplumber

from pipeline.config import DEBUG

# TODO: Update after running inspect_pdf() on the actual PDF.
MILLAGE_PAGES = []  # 0-indexed page numbers
MILLAGE_BBOX = None  # (x0, top, x1, bottom) or None

MILLAGE_TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance": 3,
    "intersection_tolerance": 3,
}

# Non-county taxing authorities (their millage is not part of the
# county budget, but is included in residents' total tax bills)
NON_COUNTY_AUTHORITIES = {
    "School Board",
    "Children's Trust",
    "Children\u2019s Trust",
    "Everglades Project",
    "South Florida Water Management District",
    "Florida Inland Navigation District",
    "SFWMD",
    "FIND",
}


def extract_millage(pdf_path: str) -> list[dict]:
    """Extract millage rate data from the Budget in Brief PDF.

    Each returned dict contains:
        - authority: Taxing authority name (e.g., 'Countywide Operating')
        - millage_rate: Raw rate string from PDF (e.g., '1.9497')
        - is_county: Boolean indicating county vs. non-county authority

    Returns raw string values for millage_rate. The transform module
    handles conversion if needed.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with millage rate data.
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        pages_to_search = (
            [pdf.pages[p] for p in MILLAGE_PAGES]
            if MILLAGE_PAGES
            else pdf.pages
        )

        for page in pages_to_search:
            target = page.crop(MILLAGE_BBOX) if MILLAGE_BBOX else page

            if DEBUG:
                try:
                    im = target.to_image(resolution=150)
                    im.debug_tablefinder(MILLAGE_TABLE_SETTINGS)
                    im.save(f"debug_millage_p{page.page_number}.png")
                except Exception:
                    pass

            tables = target.extract_tables(MILLAGE_TABLE_SETTINGS)

            for table in tables:
                parsed = _parse_millage_table(table)
                if parsed:
                    results.extend(parsed)

    return results


def _parse_millage_table(table: list[list[str]]) -> list[dict]:
    """Parse a raw pdfplumber table into millage rate dicts.

    Identifies rows that look like millage entries (authority name +
    a decimal number that looks like a millage rate).

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

        authority = str(row[0]).strip()

        # Skip header rows, total rows, and empty rows
        if not authority or authority.lower() in ("", "authority", "total", "millage"):
            continue

        # Look for a millage rate value in the remaining columns
        rate_str = None
        for cell in row[1:]:
            if cell and _looks_like_millage_rate(str(cell).strip()):
                rate_str = str(cell).strip()
                break

        if rate_str and authority:
            is_county = not any(
                non_county.lower() in authority.lower()
                for non_county in NON_COUNTY_AUTHORITIES
            )

            results.append({
                "authority": authority,
                "millage_rate": rate_str,
                "is_county": is_county,
            })

    return results


def _looks_like_millage_rate(value: str) -> bool:
    """Check if a string looks like a millage rate (small decimal number).

    Millage rates are typically between 0.0001 and 30.0000.

    Args:
        value: String to check.

    Returns:
        True if the string looks like a millage rate.
    """
    try:
        rate = float(value.replace(",", ""))
        return 0 < rate < 30
    except (ValueError, TypeError):
        return False
