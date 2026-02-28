"""Pre-load data validation for extracted budget data.

Validates structural integrity and rough total sanity before loading
into PostgreSQL. Catches extraction errors early, before they reach
the database.
"""

from pipeline.transform.clean import dollars_to_cents


# Expected counts from FY 2025-26 Budget in Brief
EXPECTED_STRATEGIC_AREAS = 9
EXPECTED_DEPARTMENTS_MIN = 30  # at least 30, typically 35
EXPECTED_REVENUE_SOURCES_MIN = 5  # at least 5, typically 7

# Rough total for sanity check: ~$8.5B operating budget
ROUGH_OPERATING_TOTAL_CENTS = 857_560_600_000  # $8,575,606,000
ROUGH_TOTAL_BUDGET_CENTS = 1_323_323_800_000   # $13,233,238,000
SANITY_TOLERANCE = 0.10  # 10% tolerance for rough checks


def validate_extracted_data(data: dict) -> list[str]:
    """Validate structural integrity of extraction output.

    Takes the output dict from extract_all() and checks that all expected
    sections are present with reasonable counts. Also checks that every
    department has a strategic_area field and that budget values are
    parseable by dollars_to_cents().

    Args:
        data: Output dict from extract_all() with keys: strategic_areas,
              departments, revenue, expenditures, millage, penny.

    Returns:
        List of warning/error messages. Empty list means valid.
    """
    issues = []

    # Check strategic_areas
    areas = data.get("strategic_areas", [])
    if not areas:
        issues.append("ERROR: strategic_areas is empty")
    elif len(areas) != EXPECTED_STRATEGIC_AREAS:
        issues.append(
            f"WARNING: Expected {EXPECTED_STRATEGIC_AREAS} strategic areas, "
            f"found {len(areas)}"
        )

    # Check departments
    departments = data.get("departments", [])
    if not departments:
        issues.append("ERROR: departments is empty")
    elif len(departments) < EXPECTED_DEPARTMENTS_MIN:
        issues.append(
            f"WARNING: Expected at least {EXPECTED_DEPARTMENTS_MIN} departments, "
            f"found {len(departments)}"
        )

    # Check every department has a strategic_area field
    for i, dept in enumerate(departments):
        if "strategic_area" not in dept:
            issues.append(
                f"ERROR: Department at index {i} "
                f"({dept.get('name', 'unknown')}) missing strategic_area field"
            )

    # Check revenue
    revenue = data.get("revenue", [])
    if not revenue:
        issues.append("ERROR: revenue is empty")
    elif len(revenue) < EXPECTED_REVENUE_SOURCES_MIN:
        issues.append(
            f"WARNING: Expected at least {EXPECTED_REVENUE_SOURCES_MIN} "
            f"revenue sources, found {len(revenue)}"
        )

    # Check millage
    millage = data.get("millage", [])
    if not millage:
        issues.append("ERROR: millage is empty")

    # Check that budget values are parseable
    for i, dept in enumerate(departments):
        for field in ("operating_budget", "capital_budget", "total_budget"):
            val = dept.get(field)
            if val is not None:
                try:
                    result = dollars_to_cents(val)
                    if not isinstance(result, int):
                        issues.append(
                            f"ERROR: Department '{dept.get('name', 'unknown')}' "
                            f"{field} produced non-int: {type(result)}"
                        )
                except Exception as e:
                    issues.append(
                        f"ERROR: Department '{dept.get('name', 'unknown')}' "
                        f"{field} value '{val}' is unparseable: {e}"
                    )

    return issues


def validate_totals_rough(data: dict) -> list[str]:
    """Quick sanity check on budget totals.

    Verifies that the sum of department operating budgets is within 10%
    of the expected ~$8.5B total, and that strategic area budgets roughly
    equal the department totals.

    Args:
        data: Output dict from extract_all().

    Returns:
        List of warning messages for suspicious totals. Empty = OK.
    """
    warnings = []

    # Sum department operating budgets
    departments = data.get("departments", [])
    dept_operating_total = 0
    for dept in departments:
        val = dept.get("operating_budget")
        if val is not None:
            try:
                dept_operating_total += dollars_to_cents(val)
            except Exception:
                pass  # already caught in validate_extracted_data

    if dept_operating_total > 0:
        ratio = dept_operating_total / ROUGH_OPERATING_TOTAL_CENTS
        if abs(1.0 - ratio) > SANITY_TOLERANCE:
            warnings.append(
                f"WARNING: Department operating total "
                f"${dept_operating_total // 100:,} is "
                f"{ratio:.1%} of expected ${ROUGH_OPERATING_TOTAL_CENTS // 100:,} "
                f"(outside {SANITY_TOLERANCE:.0%} tolerance)"
            )

    # Sum strategic area budgets
    areas = data.get("strategic_areas", [])
    area_operating_total = 0
    for area in areas:
        val = area.get("operating_budget")
        if val is not None:
            try:
                area_operating_total += dollars_to_cents(val)
            except Exception:
                pass

    if area_operating_total > 0:
        ratio = area_operating_total / ROUGH_OPERATING_TOTAL_CENTS
        if abs(1.0 - ratio) > SANITY_TOLERANCE:
            warnings.append(
                f"WARNING: Strategic area operating total "
                f"${area_operating_total // 100:,} is "
                f"{ratio:.1%} of expected ${ROUGH_OPERATING_TOTAL_CENTS // 100:,} "
                f"(outside {SANITY_TOLERANCE:.0%} tolerance)"
            )

    # Cross-check: department vs strategic area totals
    if dept_operating_total > 0 and area_operating_total > 0:
        cross_ratio = dept_operating_total / area_operating_total
        if abs(1.0 - cross_ratio) > SANITY_TOLERANCE:
            warnings.append(
                f"WARNING: Department total ${dept_operating_total // 100:,} "
                f"vs strategic area total ${area_operating_total // 100:,} "
                f"differ by {abs(1.0 - cross_ratio):.1%}"
            )

    return warnings
