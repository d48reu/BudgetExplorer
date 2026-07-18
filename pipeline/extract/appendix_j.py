"""Extract capital budget data from Appendix J PDF.

Parses the 18-page Appendix J (Capital Budget) from the Miami-Dade
County Adopted Budget. Values are in thousands.

Returns department-level capital totals for FY 25-26, strategic area
totals, and the grand capital total.
"""

import logging
import re
import pdfplumber

logger = logging.getLogger(__name__)


# Known strategic area names as they appear in Appendix J headers
KNOWN_AREAS = {
    "Public Safety": "Public Safety",
    "Transportation and Mobility": "Transportation & Mobility",
    "Transportation & Mobility": "Transportation & Mobility",
    "Recreation and Culture": "Recreation & Culture",
    "Recreation & Culture": "Recreation & Culture",
    "Neighborhood and Infrastructure": "Neighborhood & Infrastructure",
    "Neighborhood & Infrastructure": "Neighborhood & Infrastructure",
    "Health and Society": "Health & Society",
    "Health & Society": "Health & Society",
    "Economic Development": "Economic Development",
    "General Government": "General Government",
    "Constitutional Offices": "Constitutional Offices",
    "Constitutional Office": "Constitutional Offices",
    "Policy Formulation": "Policy Formulation",
}

# Known department names (uppercase) for disambiguating headers from
# project continuation lines. Built from DB seed + new departments.
KNOWN_DEPARTMENTS = {
    "CORRECTIONS AND REHABILITATION",
    "FIRE RESCUE",
    "EMERGENCY MANAGEMENT",
    "JUDICIAL ADMINISTRATION",
    "MEDICAL EXAMINER",
    "EMERGENCY COMMUNICATION",
    "TRANSPORTATION AND PUBLIC WORKS",
    "CULTURAL AFFAIRS",
    "LIBRARY",
    "LIBRARY DEPARTMENT",
    "PARKS, RECREATION AND OPEN SPACES",
    "ANIMAL SERVICES",
    "ENVIRONMENTAL RESOURCES MANAGEMENT",
    "SOLID WASTE MANAGEMENT",
    "WATER AND SEWER",
    "COMMUNITY SERVICES",
    "COMMUNITY SERVICES DEPARTMENT",
    "HOMELESS TRUST",
    "HOUSING AND COMMUNITY DEVELOPMENT",
    "AVIATION",
    "SEAPORT",
    "MIAMI-DADE ECONOMIC ADVOCACY TRUST",
    "REGULATORY AND ECONOMIC RESOURCES",
    "COMMISSION ON ETHICS AND PUBLIC TRUST",
    "COMMUNICATIONS",
    "COMMUNICATIONS, INFORMATION AND TECHNOLOGY",
    "INFORMATION AND TECHNOLOGY",
    "INSPECTOR GENERAL",
    "INTERNAL COMPLIANCE",
    "MANAGEMENT AND BUDGET",
    "PEOPLE AND INTERNAL OPERATIONS",
    "STRATEGIC PROCUREMENT",
    "NON-DEPARTMENTAL",
    "GENERAL GOVERNMENT IMPROVEMENT FUND",
    "SHERIFF",
    "SHERIFF'S OFFICE",
    "SUPERVISOR OF ELECTIONS",
    "TAX COLLECTOR",
    "PROPERTY APPRAISER",
    "CLERK OF THE COURT AND COMPTROLLER",
    "LEGAL AID",
    "LAW LIBRARY",
    "JUVENILE SERVICES",
    "JACKSON HEALTH SYSTEM",
    "OFFICE OF THE CITIZENS' INDEPENDENT TRANSPORTATION TRUST",
}


def _extract_numbers(text: str) -> list[str]:
    """Extract all comma-separated numbers from a string."""
    return re.findall(r"[\d,]+", text)


def _is_header_line(line: str) -> bool:
    """Check if line is a page header/footer to skip."""
    stripped = line.strip()
    if not stripped:
        return True
    if stripped.startswith("APPENDIX J"):
        return True
    if stripped.startswith("(dollars in thousands)"):
        return True
    if re.match(r"^-+\d+-+$", stripped.replace(" ", "")):
        return True
    if stripped.startswith("25-26"):
        return True
    if stripped.startswith("Prior Years"):
        return True
    if re.match(r"^\d{2,3}$", stripped):
        return True
    return False


def _normalize_dept_name(name: str) -> str:
    """Normalize department name from ALL CAPS to title case equivalent."""
    # Map specific ALL CAPS names to their DB equivalents
    name_map = {
        "LIBRARY DEPARTMENT": "Library",
        "SHERIFF'S OFFICE": "Sheriff's Office",
        "SHERIFF'S OFFFICE": "Sheriff's Office",  # typo in PDF
        "COMMUNITY SERVICES DEPARTMENT": "Community Services Department",
        "COMMUNITY SERVICES": "Community Services",
    }
    if name in name_map:
        return name_map[name]

    # General title case conversion
    words = name.split()
    result = []
    small_words = {"AND", "OF", "THE", "FOR", "IN", "AT", "TO", "OR"}
    for i, w in enumerate(words):
        if i == 0 or w not in small_words:
            result.append(w.title())
        else:
            result.append(w.lower())
    return " ".join(result)


def extract_appendix_j(pdf_path: str) -> dict:
    """Parse Appendix J and extract capital budget data.

    Args:
        pdf_path: Path to the Appendix J PDF file.

    Returns:
        Dict with keys:
            departments: list of dicts with strategic_area, department, total_25_26
            area_totals: list of dicts with strategic_area, total_25_26
            grand_total: the total capital budget string (thousands)
    """
    all_lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                all_lines.extend(text.split("\n"))

    departments = []
    area_totals = []
    grand_total = None

    current_area = None
    current_dept = None

    for line in all_lines:
        stripped = line.strip()

        if _is_header_line(stripped):
            continue

        # Check for Grand Total
        if stripped.startswith("Grand Total"):
            numbers = _extract_numbers(stripped)
            # 9 columns: Prior Years, Bonds, State, Federal, Gas Tax, Other, Total, Future, Total Cost
            # Require all 9: a blank or dash column would shift the indexes
            # and silently read the wrong column as the total.
            if len(numbers) == 9:
                grand_total = numbers[6]
            else:
                logger.warning(
                    "Appendix J: unexpected column count (%d of 9) in Grand "
                    "Total -- skipped: %r", len(numbers), stripped,
                )
            continue

        # Check for Strategic Area Total
        if stripped.startswith("Strategic Area Total"):
            numbers = _extract_numbers(stripped)
            if len(numbers) == 9 and current_area:
                area_totals.append({
                    "strategic_area": current_area,
                    "total_25_26": numbers[6],
                })
            elif current_area:
                logger.warning(
                    "Appendix J: unexpected column count (%d of 9) in "
                    "Strategic Area Total for %r -- skipped: %r",
                    len(numbers), current_area, stripped,
                )
            continue

        # Check for Department Total (no colon in Appendix J)
        if stripped.startswith("Department Total"):
            numbers = _extract_numbers(stripped)
            if len(numbers) == 9 and current_dept and current_area:
                departments.append({
                    "strategic_area": current_area,
                    "department": current_dept,
                    "total_25_26": numbers[6],
                })
            elif current_dept and current_area:
                logger.warning(
                    "Appendix J: unexpected column count (%d of 9) in "
                    "Department Total for %r -- skipped: %r",
                    len(numbers), current_dept, stripped,
                )
            elif current_dept is None:
                logger.warning(
                    "Appendix J: Department Total with no open department "
                    "(unrecognized header above?) -- dropped: %r", stripped
                )
            # Close the block so a later unrecognized header can't cause
            # this department to absorb another department's total.
            current_dept = None
            continue

        # Check for strategic area header (mixed case, no numbers)
        for area_text, normalized in KNOWN_AREAS.items():
            if stripped == area_text:
                current_area = normalized
                break

        # Check for department header (ALL CAPS, no digits on line).
        # Test for digits, not _extract_numbers: its [\d,]+ pattern matches
        # the bare comma in names like "PARKS, RECREATION AND OPEN SPACES",
        # which made comma-named departments unrecognizable as headers.
        if not re.search(r"\d", stripped):
            upper = stripped.upper()
            if upper == stripped and len(stripped) > 2 and re.search(r"[A-Z]", stripped):
                # ALL CAPS line with no numbers -- check if known department
                if stripped in KNOWN_DEPARTMENTS:
                    current_dept = _normalize_dept_name(stripped)
                elif current_dept is None:
                    # No department block is open, so this should be the next
                    # department's header. Unknown means a new or renamed
                    # department in this PDF: warn instead of silently letting
                    # its total vanish. (ALL-CAPS lines inside an open block
                    # are wrapped project names and stay ignored.)
                    logger.warning(
                        "Appendix J: unrecognized possible department header %r "
                        "-- if this is a department, add it to KNOWN_DEPARTMENTS; "
                        "its capital total will be dropped until then",
                        stripped,
                    )

    return {
        "departments": departments,
        "area_totals": area_totals,
        "grand_total": grand_total,
    }
