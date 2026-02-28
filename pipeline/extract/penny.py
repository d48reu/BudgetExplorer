"""Extract penny/dollar breakdown data from the Budget in Brief PDF.

The Budget in Brief contains a graphic showing how each dollar of
the budget is allocated by strategic area (e.g., "19 cents of every
dollar goes to Public Safety"). Per user decision, this data must be
extracted directly from the PDF rather than calculated from totals.

If the data is in a graphic rather than a table, this module implements
text extraction from the graphic region and parses the cent values.

Page numbers and bounding boxes must be determined by running
inspect_pdf() first and examining the debug images.
"""

import re

import pdfplumber

from pipeline.config import DEBUG

# TODO: Update after running inspect_pdf() on the actual PDF.
PENNY_PAGES = []  # 0-indexed page numbers
PENNY_BBOX = None  # (x0, top, x1, bottom) or None

# The penny breakdown may be in a graphic, not a table.
# If so, we use text extraction rather than table extraction.
USE_TEXT_EXTRACTION = True

# Known strategic area names for matching penny values
PENNY_AREA_NAMES = {
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


def extract_penny(pdf_path: str) -> list[dict]:
    """Extract penny/dollar breakdown from the Budget in Brief PDF.

    Each returned dict contains:
        - strategic_area: Strategic area name
        - cents_per_dollar: Integer cents value (e.g., 19 for "19 cents")

    This data is extracted directly from the PDF per user decision,
    NOT calculated from budget totals.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with penny breakdown data.
    """
    if USE_TEXT_EXTRACTION:
        return _extract_penny_from_text(pdf_path)
    else:
        return _extract_penny_from_table(pdf_path)


def _extract_penny_from_text(pdf_path: str) -> list[dict]:
    """Extract penny data from text in a graphic region.

    The penny graphic typically shows text like "19 cents" or "19c"
    next to strategic area labels. This function extracts text from
    the penny region and parses out area-to-cents mappings.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with penny breakdown data.
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        pages_to_search = (
            [pdf.pages[p] for p in PENNY_PAGES]
            if PENNY_PAGES
            else pdf.pages
        )

        for page in pages_to_search:
            target = page.crop(PENNY_BBOX) if PENNY_BBOX else page

            if DEBUG:
                try:
                    im = target.to_image(resolution=150)
                    debug_path = f"debug_penny_p{page.page_number}.png"
                    im.save(debug_path)
                except Exception:
                    pass

            text = target.extract_text(layout=True)
            if text:
                parsed = _parse_penny_text(text)
                if parsed:
                    results.extend(parsed)

    return results


def _extract_penny_from_table(pdf_path: str) -> list[dict]:
    """Extract penny data from a table (fallback if data is tabular).

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with penny breakdown data.
    """
    results = []

    table_settings = {
        "vertical_strategy": "lines",
        "horizontal_strategy": "lines",
        "snap_tolerance": 3,
        "intersection_tolerance": 3,
    }

    with pdfplumber.open(pdf_path) as pdf:
        pages_to_search = (
            [pdf.pages[p] for p in PENNY_PAGES]
            if PENNY_PAGES
            else pdf.pages
        )

        for page in pages_to_search:
            target = page.crop(PENNY_BBOX) if PENNY_BBOX else page
            tables = target.extract_tables(table_settings)

            for table in tables:
                for row in table:
                    if not row or not row[0]:
                        continue

                    cell_text = str(row[0]).strip()
                    if cell_text in PENNY_AREA_NAMES:
                        # Look for cent value in subsequent columns
                        for cell in row[1:]:
                            if cell:
                                cents = _parse_cents_value(str(cell).strip())
                                if cents is not None:
                                    results.append({
                                        "strategic_area": cell_text,
                                        "cents_per_dollar": cents,
                                    })
                                    break

    return results


def _parse_penny_text(text: str) -> list[dict]:
    """Parse penny breakdown from extracted text.

    Looks for patterns like:
        - "Public Safety 19 cents"
        - "Public Safety 19c"
        - "19 cents ... Public Safety"
        - "19 Public Safety"

    Args:
        text: Extracted text from the penny region.

    Returns:
        List of dicts with penny breakdown data.
    """
    results = []
    lines = text.split("\n")

    # Pattern: area name followed by a number (cents)
    area_then_cents = re.compile(
        r"([A-Z][A-Za-z &]+?)\s+(\d{1,2})\s*(?:cents?|c|\u00a2)?",
        re.IGNORECASE,
    )

    # Pattern: number (cents) followed by area name
    cents_then_area = re.compile(
        r"(\d{1,2})\s*(?:cents?|c|\u00a2)?\s+([A-Z][A-Za-z &]+)",
        re.IGNORECASE,
    )

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Try both patterns
        for match in area_then_cents.finditer(line):
            area_name = match.group(1).strip()
            cents_val = int(match.group(2))
            if _is_known_area(area_name) and 1 <= cents_val <= 50:
                results.append({
                    "strategic_area": _normalize_area_name(area_name),
                    "cents_per_dollar": cents_val,
                })

        if not results:
            for match in cents_then_area.finditer(line):
                cents_val = int(match.group(1))
                area_name = match.group(2).strip()
                if _is_known_area(area_name) and 1 <= cents_val <= 50:
                    results.append({
                        "strategic_area": _normalize_area_name(area_name),
                        "cents_per_dollar": cents_val,
                    })

    return results


def _parse_cents_value(value: str) -> int | None:
    """Parse a string that might contain a cents value.

    Args:
        value: String like '19', '19 cents', '19c', etc.

    Returns:
        Integer cents value, or None if not parseable.
    """
    match = re.search(r"(\d{1,2})", value)
    if match:
        val = int(match.group(1))
        if 1 <= val <= 50:
            return val
    return None


def _is_known_area(name: str) -> bool:
    """Check if a name matches a known strategic area."""
    name_lower = name.lower().strip()
    for area in PENNY_AREA_NAMES:
        if area.lower() in name_lower or name_lower in area.lower():
            return True
    return False


def _normalize_area_name(name: str) -> str:
    """Normalize a strategic area name to canonical form."""
    name = name.strip()
    normalizations = {
        "Transportation and Mobility": "Transportation & Mobility",
        "Recreation and Culture": "Recreation & Culture",
        "Neighborhood and Infrastructure": "Neighborhood & Infrastructure",
        "Health and Society": "Health & Society",
    }
    return normalizations.get(name, name)
