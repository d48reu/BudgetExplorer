"""Data cleaning and conversion utilities for budget data.

Converts raw dollar strings from PDF extraction to integer cents (BigInt),
cleans percentages, employee counts, and department names.

All monetary values must pass through dollars_to_cents() before database
insertion -- never store raw dollar strings or floats.
"""

import re
import unicodedata


def dollars_to_cents(value) -> int:
    """Convert a dollar string to integer cents.

    Handles all observed formats from budget PDFs:
        $1,234,567 | 1,234,567 | ($1,234) | -$1,234 | 1234.56
        $0 | "" | "-" | "N/A" | None | $13,233,238,000

    Parentheses indicate negative values (standard budget convention).
    Returns integer cents (value * 100). Never returns a float.

    Args:
        value: Dollar string, number, or None.

    Returns:
        Integer cents. Returns 0 for empty/null/dash/N/A values.
    """
    if value is None:
        return 0

    s = str(value).strip()

    if s in ("", "-", "N/A", "n/a", "--", "—"):
        return 0

    # Detect negative: parentheses or leading minus sign
    negative = s.startswith("(") or s.startswith("-")

    # Remove all non-numeric characters except decimal point
    cleaned = re.sub(r"[^0-9.]", "", s)

    if not cleaned:
        return 0

    # Convert to cents -- avoid float for whole dollar amounts
    if "." in cleaned:
        # Has decimal: use float only for the multiplication, then round to int
        dollars = float(cleaned)
        cents = round(dollars * 100)
    else:
        # Whole dollar amount (no decimal) -- common in budget summaries
        # Multiply by 100 as integer -- no float involved
        cents = int(cleaned) * 100

    return -cents if negative else cents


def clean_percentage(value) -> float | None:
    """Convert a percentage string to a float.

    Handles: "25.3%" | "25.3" | "" | None | "-"

    Args:
        value: Percentage string or None.

    Returns:
        Float percentage value, or None for empty/null values.
    """
    if value is None:
        return None

    s = str(value).strip()

    if s in ("", "-", "N/A", "n/a", "--", "—"):
        return None

    # Strip % sign and any whitespace
    cleaned = s.replace("%", "").strip()

    if not cleaned:
        return None

    try:
        return float(cleaned)
    except ValueError:
        return None


def clean_employee_count(value) -> int | None:
    """Convert an employee count string to an integer.

    Handles: "3,500" | "3500" | "" | None | "-"

    Args:
        value: Employee count string or None.

    Returns:
        Integer employee count, or None for empty/null values.
    """
    if value is None:
        return None

    s = str(value).strip()

    if s in ("", "-", "N/A", "n/a", "--", "—"):
        return None

    # Remove commas and whitespace
    cleaned = s.replace(",", "").strip()

    if not cleaned:
        return None

    try:
        return int(float(cleaned))
    except ValueError:
        return None


def clean_department_name(name: str) -> str:
    """Normalize a department name from PDF extraction.

    Strips whitespace, normalizes unicode quotes/dashes, and removes
    footnote markers (*, +, etc.) that PDF extraction may include.

    Args:
        name: Raw department name string.

    Returns:
        Cleaned department name string.
    """
    if not name:
        return ""

    # Normalize unicode to NFC form (canonical decomposition + composition)
    s = unicodedata.normalize("NFC", name)

    # Normalize unicode quotes to ASCII
    s = s.replace("\u2018", "'").replace("\u2019", "'")  # smart single quotes
    s = s.replace("\u201c", '"').replace("\u201d", '"')  # smart double quotes

    # Normalize unicode dashes to ASCII hyphen
    s = s.replace("\u2013", "-").replace("\u2014", "-")  # en-dash, em-dash

    # Remove footnote markers at end of name
    s = re.sub(r"[\*\+\u2020\u2021]+\s*$", "", s)  # *, +, dagger, double dagger

    # Remove leading footnote markers too
    s = re.sub(r"^[\*\+\u2020\u2021]+\s*", "", s)

    # Collapse multiple spaces into one
    s = re.sub(r"\s+", " ", s)

    # Strip leading/trailing whitespace
    s = s.strip()

    return s
