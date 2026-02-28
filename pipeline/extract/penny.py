"""Extract penny/dollar breakdown from the Budget in Brief PDF.

Page 4 (index 4) has "Your Dollar at Work" showing how each dollar
is allocated by strategic area (e.g., "Public Safety 19¢").

Uses word-level positioning to match area names with their cent values.
"""

import re

import pdfplumber


# Page 4 (0-indexed)
PENNY_PAGE = 4

# The penny breakdown is in the top section of page 4 (above descriptions)
PENNY_Y_MAX = 330  # Only look above this Y for penny values

# Canonical area names
AREA_NAMES = {
    "Public Safety": "Public Safety",
    "Neighborhood & Infrastructure": "Neighborhood & Infrastructure",
    "Neighborhood": "Neighborhood & Infrastructure",
    "Recreation & Culture": "Recreation & Culture",
    "Recreation": "Recreation & Culture",
    "Economic Development": "Economic Development",
    "Economic": "Economic Development",
    "Policy Formulation": "Policy Formulation",
    "Policy": "Policy Formulation",
    "Transportation & Mobility": "Transportation & Mobility",
    "Transportation": "Transportation & Mobility",
    "General Government": "General Government",
    "General": "General Government",
    "Health & Society": "Health & Society",
    "Health": "Health & Society",
    "Constitutional Offices": "Constitutional Offices",
    "Constitutional": "Constitutional Offices",
}


def extract_penny(pdf_path: str) -> list[dict]:
    """Extract penny/dollar breakdown from the Budget in Brief PDF.

    Uses word-level positioning to find strategic area names and their
    associated cent values (e.g., "19¢") in the top graphic of page 4.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with {strategic_area, cents_per_dollar}.
    """
    with pdfplumber.open(pdf_path) as pdf:
        if PENNY_PAGE >= len(pdf.pages):
            return []

        page = pdf.pages[PENNY_PAGE]
        # Also look at the text descriptions below for "AREA NAME N¢" patterns
        text = page.extract_text(layout=False) or ""
        return _parse_penny_text(text)


def _parse_penny_text(text: str) -> list[dict]:
    """Parse penny values from the page text.

    Looks for patterns like "PUBLIC SAFETY 19¢" or "AREA NAME N¢"
    in the text descriptions.
    """
    results = {}

    # Pattern: AREA_NAME followed by N¢ (from the description headings)
    # e.g., "PUBLIC SAFETY 19¢", "GENERAL GOVERNMENT 6¢"
    heading_pattern = re.compile(
        r"(PUBLIC SAFETY|GENERAL GOVERNMENT|NEIGHBORHOOD AND INFRASTRUCTURE|"
        r"RECREATION AND CULTURE|TRANSPORTATION AND MOBILITY|"
        r"HEALTH AND SOCIETY|ECONOMIC DEVELOPMENT|"
        r"CONSTITUTIONAL OFFICES|POLICY FORMULATION)\s+(\d{1,2})¢",
        re.IGNORECASE,
    )

    for match in heading_pattern.finditer(text):
        area_upper = match.group(1).upper()
        cents = int(match.group(2))

        canonical = _normalize_area(area_upper)
        if canonical and canonical not in results:
            results[canonical] = cents

    return [
        {"strategic_area": area, "cents_per_dollar": cents}
        for area, cents in results.items()
    ]


def _normalize_area(name: str) -> str | None:
    """Normalize an area name to canonical form."""
    mapping = {
        "PUBLIC SAFETY": "Public Safety",
        "GENERAL GOVERNMENT": "General Government",
        "NEIGHBORHOOD AND INFRASTRUCTURE": "Neighborhood & Infrastructure",
        "RECREATION AND CULTURE": "Recreation & Culture",
        "TRANSPORTATION AND MOBILITY": "Transportation & Mobility",
        "HEALTH AND SOCIETY": "Health & Society",
        "ECONOMIC DEVELOPMENT": "Economic Development",
        "CONSTITUTIONAL OFFICES": "Constitutional Offices",
        "POLICY FORMULATION": "Policy Formulation",
    }
    return mapping.get(name.upper())
