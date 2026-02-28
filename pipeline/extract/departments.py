"""Extract department budget data from the Budget in Brief PDF.

Departments are grouped under strategic areas. Each department has
operating, capital, total budgets and employee counts. The department
tables may span multiple pages with different formatting per section.

Page numbers and bounding boxes must be determined by running
inspect_pdf() first and examining the debug images.
"""

import pdfplumber

from pipeline.config import DEBUG

# TODO: Update after running inspect_pdf() on the actual PDF.
# Map of strategic area name to page ranges and bboxes.
DEPARTMENT_PAGES = []  # List of 0-indexed page numbers containing department tables
DEPARTMENT_BBOX = None  # (x0, top, x1, bottom) in points, or None for full page

# Default table settings for department tables.
# Different strategic area sections may need different settings.
DEPARTMENT_TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance": 3,
    "intersection_tolerance": 3,
}

# Per-section overrides if needed (key = strategic area name)
SECTION_TABLE_SETTINGS = {}


def extract_departments(pdf_path: str) -> list[dict]:
    """Extract department budget data from the Budget in Brief PDF.

    Each returned dict contains:
        - strategic_area: Name of the parent strategic area
        - name: Department name
        - operating_budget: Raw dollar string from PDF
        - capital_budget: Raw dollar string from PDF
        - total_budget: Raw dollar string from PDF
        - employee_count: Raw string from PDF

    Returns raw string values. The transform module handles conversion
    to cents.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with department budget data.
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        pages_to_search = (
            [pdf.pages[p] for p in DEPARTMENT_PAGES]
            if DEPARTMENT_PAGES
            else pdf.pages
        )

        current_strategic_area = None

        for page in pages_to_search:
            target = page.crop(DEPARTMENT_BBOX) if DEPARTMENT_BBOX else page

            # Debug: save table detection image
            if DEBUG:
                try:
                    im = target.to_image(resolution=150)
                    im.debug_tablefinder(DEPARTMENT_TABLE_SETTINGS)
                    im.save(f"debug_departments_p{page.page_number}.png")
                except Exception:
                    pass

            # Try text extraction to find strategic area headers
            text = target.extract_text(layout=True)
            if text:
                current_strategic_area = _detect_strategic_area_header(
                    text, current_strategic_area
                )

            # Extract tables from this page
            tables = target.extract_tables(DEPARTMENT_TABLE_SETTINGS)

            for table in tables:
                parsed = _parse_department_table(table, current_strategic_area)
                if parsed:
                    results.extend(parsed)

    return results


# Known strategic area names for header detection
KNOWN_STRATEGIC_AREAS = [
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
]

# Known department names for matching
KNOWN_DEPARTMENTS = {
    "Office of the Mayor",
    "Board of County Commissioners",
    "County Attorney's Office",
    "County Attorney\u2019s Office",
    "Sheriff",
    "Supervisor of Elections",
    "Tax Collector",
    "Property Appraiser",
    "Clerk of the Court and Comptroller",
    "Corrections and Rehabilitation",
    "Fire Rescue",
    "Emergency Management",
    "Judicial Administration",
    "Medical Examiner",
    "Emergency Communication",
    "Transportation and Public Works",
    "Cultural Affairs",
    "Library",
    "Parks, Recreation and Open Spaces",
    "Animal Services",
    "Environmental Resources Management",
    "Solid Waste Management",
    "Water and Sewer",
    "Community Services Department",
    "Homeless Trust",
    "Housing and Community Development",
    "Aviation",
    "Seaport",
    "Miami-Dade Economic Advocacy Trust",
    "Regulatory and Economic Resources",
    "Commission on Ethics and Public Trust",
    "Communications",
    "Information and Technology",
    "Inspector General",
    "Internal Compliance",
    "Management and Budget",
    "People and Internal Operations",
    "Strategic Procurement",
}


def _detect_strategic_area_header(
    text: str, current_area: str | None
) -> str | None:
    """Detect if the page text contains a strategic area header.

    Scans the first several lines of extracted text for known
    strategic area names.

    Args:
        text: Extracted page text.
        current_area: Currently active strategic area name.

    Returns:
        Updated strategic area name, or current_area if no header found.
    """
    lines = text.split("\n")[:15]  # Check first 15 lines

    for line in lines:
        stripped = line.strip()
        for area in KNOWN_STRATEGIC_AREAS:
            if area.lower() in stripped.lower():
                return area

    return current_area


def _parse_department_table(
    table: list[list[str]], strategic_area: str | None
) -> list[dict]:
    """Parse a raw pdfplumber table into department dicts.

    Args:
        table: Raw table from pdfplumber extract_tables().
        strategic_area: Parent strategic area name.

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

        # Check if this row contains a department name
        if cell_text in KNOWN_DEPARTMENTS:
            dept = {
                "strategic_area": strategic_area or "Unknown",
                "name": cell_text,
            }

            if len(row) >= 2 and row[1]:
                dept["operating_budget"] = str(row[1]).strip()
            if len(row) >= 3 and row[2]:
                dept["capital_budget"] = str(row[2]).strip()
            if len(row) >= 4 and row[3]:
                dept["total_budget"] = str(row[3]).strip()
            if len(row) >= 5 and row[4]:
                dept["employee_count"] = str(row[4]).strip()

            results.append(dept)

        # Also check if the row updates the strategic area context
        for area in KNOWN_STRATEGIC_AREAS:
            if area.lower() in cell_text.lower() and cell_text not in KNOWN_DEPARTMENTS:
                strategic_area = area
                break

    return results
