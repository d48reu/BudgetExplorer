"""Extract millage rate data from the Budget in Brief PDF.

Page 5 (index 5) has a millage table showing property tax rates by
taxing authority for a $200,000 home example. The table is the third
lines-based table on the page.
"""

import pdfplumber


# Page 5 (0-indexed), table index 2 (third table on page)
MILLAGE_PAGE = 5
MILLAGE_TABLE_INDEX = 2

MILLAGE_TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
}

# Non-county taxing authorities
NON_COUNTY_KEYWORDS = [
    "school board",
    "children's trust",
    "children\u2019s trust",
    "everglades",
    "okeechobee",
    "water mgmt",
    "water management",
    "navigation district",
    "other",
]


def extract_millage(pdf_path: str) -> list[dict]:
    """Extract millage rate data from the Budget in Brief PDF.

    Each returned dict contains:
        - authority: Taxing authority name
        - millage_rate: Rate string (e.g., '4.5740')
        - is_county: Boolean indicating county vs. non-county authority
        - tax_amount: Dollar amount for example home (e.g., '$686')
        - percent_of_total: Percentage string (e.g., '27%')

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with millage rate data.
    """
    with pdfplumber.open(pdf_path) as pdf:
        if MILLAGE_PAGE >= len(pdf.pages):
            return []

        page = pdf.pages[MILLAGE_PAGE]
        tables = page.extract_tables(MILLAGE_TABLE_SETTINGS)

        if len(tables) <= MILLAGE_TABLE_INDEX:
            return []

        table = tables[MILLAGE_TABLE_INDEX]
        return _parse_millage_table(table)


def _parse_millage_table(table: list[list[str]]) -> list[dict]:
    """Parse the millage rate table."""
    results = []

    for row in table:
        if not row or not row[0]:
            continue

        authority = str(row[0]).strip()

        # Skip header, title, and empty rows
        if not authority or authority.upper() in ("AUTHORITY", "TOTAL", ""):
            continue
        if "EXAMPLE OF TAXES" in authority.upper():
            continue

        # Get millage rate from column 1
        rate_str = str(row[1]).strip() if row[1] else None
        if not rate_str or not _looks_like_millage_rate(rate_str):
            continue

        # Clean up multi-line authority names (replace newlines with spaces)
        authority = authority.replace("\n", " ").strip()
        # Truncate long names to fit VARCHAR(100)
        if len(authority) > 100:
            authority = authority[:97] + "..."

        # Determine if county authority
        authority_lower = authority.lower()
        is_county = not any(kw in authority_lower for kw in NON_COUNTY_KEYWORDS)

        entry = {
            "authority": authority,
            "millage_rate": rate_str,
            "is_county": is_county,
        }

        # Tax amount (column 2)
        if len(row) > 2 and row[2]:
            entry["tax_amount"] = str(row[2]).strip()

        # Percent of total (column 3)
        if len(row) > 3 and row[3]:
            entry["percent_of_total"] = str(row[3]).strip()

        results.append(entry)

    return results


def _looks_like_millage_rate(value: str) -> bool:
    """Check if a string looks like a millage rate (small decimal number)."""
    try:
        rate = float(value.replace(",", ""))
        return 0 < rate < 30
    except (ValueError, TypeError):
        return False
