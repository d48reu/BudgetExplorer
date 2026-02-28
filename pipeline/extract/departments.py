"""Extract department data from the Budget in Brief PDF.

The Budget in Brief page 4 (index 4) lists departments under each
strategic area in a two-column layout. Left column (x < 300) and
right column (x >= 300) are processed independently.

Individual department budgets are NOT in this PDF — only the
department-to-strategic-area groupings.
"""

import re

import pdfplumber


# Page 4 (0-indexed) has the "Your Dollar at Work" section
DEPARTMENTS_PAGE = 4

# Column boundary (in PDF points)
COLUMN_SPLIT_X = 300

# Y threshold: department listings start below the penny graphic
DEPT_LISTING_START_Y = 330

# Canonical area names as they appear in ALL CAPS on page 4
AREA_HEADERS = {
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


def extract_departments(pdf_path: str) -> list[dict]:
    """Extract department names grouped by strategic area.

    Separates the two-column layout on page 4, then parses each column
    for strategic area headers followed by "Departments:" listings.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        List of dicts with {strategic_area, name} for each department.
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        if DEPARTMENTS_PAGE >= len(pdf.pages):
            return results

        page = pdf.pages[DEPARTMENTS_PAGE]
        width = page.width
        height = page.height

        # Crop into left and right columns below the penny graphic
        left_col = page.crop((0, DEPT_LISTING_START_Y, COLUMN_SPLIT_X, height))
        right_col = page.crop((COLUMN_SPLIT_X, DEPT_LISTING_START_Y, width, height))

        left_text = left_col.extract_text(layout=False) or ""
        right_text = right_col.extract_text(layout=False) or ""

        results.extend(_parse_column(left_text))
        results.extend(_parse_column(right_text))

    return results


def _parse_column(text: str) -> list[dict]:
    """Parse a single column of text for area headers and department lists.

    Expected pattern:
        AREA NAME [penny value]
        [description text]
        Departments: Dept A, Dept B, Dept C

    For Constitutional Offices, uses "Offices:" instead.

    Args:
        text: Extracted text from one column.

    Returns:
        List of dicts with {strategic_area, name}.
    """
    results = []
    current_area = None

    # Split into sections by area headers
    # Find all area header positions
    lines = text.split("\n")
    sections = []
    current_section_start = 0

    for i, line in enumerate(lines):
        stripped = line.strip().upper()
        # Remove penny values like "19¢" from the line for matching
        stripped_clean = re.sub(r"\d+¢", "", stripped).strip()
        # Remove stray leading characters from column bleed (1-2 chars before area name)
        stripped_clean = re.sub(r"^[a-z.,\s]{1,3}\s+", "", stripped_clean, flags=re.IGNORECASE).strip()

        for pdf_name in AREA_HEADERS:
            if pdf_name == stripped_clean or pdf_name in stripped_clean:
                if current_area is not None:
                    section_text = "\n".join(lines[current_section_start:i])
                    sections.append((current_area, section_text))
                current_area = AREA_HEADERS[pdf_name]
                current_section_start = i
                break

    # Don't forget the last section
    if current_area is not None:
        section_text = "\n".join(lines[current_section_start:])
        sections.append((current_area, section_text))

    # Extract departments from each section
    for area_name, section_text in sections:
        # Find "Departments:" or "Offices:" and capture until end of section
        dept_match = re.search(
            r"(?:Departments|Offices):\s*(.+)",
            section_text,
            re.IGNORECASE | re.DOTALL,
        )
        if dept_match:
            dept_text = dept_match.group(1).strip()
            dept_names = _split_department_names(dept_text)
            for name in dept_names:
                # Clean stray single characters and punctuation from column bleed
                name = re.sub(r"^[a-z.,\s]{1,2}\s", "", name.strip()).strip()
                name = re.sub(r"\s+[a-z.,]{1,2}$", "", name).strip()
                if name and len(name) > 3 and not _is_description_text(name):
                    results.append({
                        "strategic_area": area_name,
                        "name": name,
                    })

    return results


    # Known multi-word department names that contain commas
KNOWN_COMMA_DEPTS = [
    "Parks, Recreation and Open Spaces",
]


def _split_department_names(text: str) -> list[str]:
    """Split a comma-separated department list.

    Handles: "Dept A, Dept B, and Dept C"
    Also handles multi-line wrapping and "and" conjunctions.
    Preserves known department names that contain commas.

    Args:
        text: Raw department list text.

    Returns:
        List of individual department names.
    """
    # Clean up whitespace and newlines
    text = re.sub(r"\s+", " ", text).strip()

    # Remove trailing period, footnote markers, page numbers
    text = re.sub(r"[.\*+]+$", "", text).strip()
    text = re.sub(r"\d+$", "", text).strip()  # trailing page number
    # Remove "NOTE:" and everything after
    text = re.sub(r"NOTE:.*$", "", text, flags=re.IGNORECASE).strip()

    # Replace known comma-containing department names with placeholders
    placeholders = {}
    for i, dept_name in enumerate(KNOWN_COMMA_DEPTS):
        placeholder = f"__DEPT_PLACEHOLDER_{i}__"
        if dept_name.lower() in text.lower():
            # Find and replace case-insensitively
            pattern = re.compile(re.escape(dept_name), re.IGNORECASE)
            text = pattern.sub(placeholder, text)
            placeholders[placeholder] = dept_name

    # Split on comma
    parts = [p.strip() for p in text.split(",")]

    # Handle "and" prefix in parts
    final_parts = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Handle "and the Clerk of the Court and Comptroller" as one unit
        and_match = re.match(r"^and\s+(?:the\s+)?(.+)", part, re.IGNORECASE)
        if and_match:
            final_parts.append(and_match.group(1).strip())
        else:
            final_parts.append(part)

    # Restore placeholders and fix known artifacts
    cleaned = []
    for name in final_parts:
        # Restore placeholder department names
        for placeholder, real_name in placeholders.items():
            if placeholder in name:
                name = name.replace(placeholder, real_name)

        # Fix truncated names from column crop
        name = re.sub(r"\s*\.\s+", " ", name)  # "Clerk of the . Court" → "Clerk of the Court"
        # Fix known truncations
        if name == "Judicia Administration":
            name = "Judicial Administration"
        cleaned.append(name.strip())

    return cleaned


def _is_description_text(text: str) -> bool:
    """Check if text looks like description prose rather than a department name.

    Department names are proper nouns (short, capitalized).
    Description text is longer sentences with lowercase words.
    """
    # If it contains common description phrases, skip it
    description_markers = [
        "to effectuate", "amendment", "mandates", "approved by",
        "precipitated", "established", "ensuring", "accountable",
        "voters", "elected positions", "prevents", "ordinances",
        "charter", "changed to", "directly",
    ]
    text_lower = text.lower()
    return any(marker in text_lower for marker in description_markers)
