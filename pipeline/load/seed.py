"""Idempotent database seeding for all budget data types.

Uses a delete-write pattern: for each fiscal year, existing records are
deleted before inserting new ones. This makes the pipeline safe to re-run.

All monetary values must be in integer cents (BigInt) before insertion.
Use pipeline.transform.clean.dollars_to_cents() for conversion.
"""

import logging
from decimal import Decimal

from pipeline.transform.clean import (
    dollars_to_cents,
    thousands_to_cents,
    clean_percentage,
    clean_employee_count,
    clean_department_name,
)

logger = logging.getLogger(__name__)


def seed_fiscal_year(conn, label: str, start_date: str, end_date: str,
                     totals: dict, is_adopted: bool = True) -> int:
    """Insert or update a fiscal year record.

    Uses ON CONFLICT (label) DO UPDATE for idempotency.

    Args:
        conn: psycopg2 connection.
        label: Fiscal year label (e.g., 'FY 2025-26').
        start_date: Start date string (e.g., '2025-10-01').
        end_date: End date string (e.g., '2026-09-30').
        totals: Dict with keys: operating_cents, capital_cents,
                total_cents, employees. Legacy fiscal-year totals are only
                populated for an adopted release.
        is_adopted: Whether this load is the adopted release.

    Returns:
        The fiscal_year_id (serial primary key).
    """
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO fiscal_years
            (label, start_date, end_date, total_operating, total_capital,
             total_budget, total_employees, is_adopted)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (label) DO UPDATE SET
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            total_operating = CASE WHEN EXCLUDED.is_adopted
                THEN EXCLUDED.total_operating ELSE fiscal_years.total_operating END,
            total_capital = CASE WHEN EXCLUDED.is_adopted
                THEN EXCLUDED.total_capital ELSE fiscal_years.total_capital END,
            total_budget = CASE WHEN EXCLUDED.is_adopted
                THEN EXCLUDED.total_budget ELSE fiscal_years.total_budget END,
            total_employees = CASE WHEN EXCLUDED.is_adopted
                THEN EXCLUDED.total_employees ELSE fiscal_years.total_employees END,
            is_adopted = COALESCE(fiscal_years.is_adopted, FALSE)
                OR EXCLUDED.is_adopted
        RETURNING id
    """, (
        label,
        start_date,
        end_date,
        totals.get("operating_cents") if is_adopted else None,
        totals.get("capital_cents") if is_adopted else None,
        totals.get("total_cents") if is_adopted else None,
        totals.get("employees") if is_adopted else None,
        is_adopted,
    ))

    fiscal_year_id = cur.fetchone()[0]
    cur.close()

    logger.info("Seeded fiscal year %s (id=%d)", label, fiscal_year_id)
    return fiscal_year_id


def seed_budget_release(conn, fiscal_year_id: int, stage: str,
                        totals: dict, metadata: dict | None = None):
    """Insert or update release-scoped totals and official source metadata."""
    metadata = metadata or {}
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO budget_releases
            (fiscal_year_id, stage, as_of_date, published_at,
             total_operating, total_capital, total_budget, total_employees,
             budget_in_brief_url, volume_1_url, volume_2_url, volume_3_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (fiscal_year_id, stage) DO UPDATE SET
            as_of_date = EXCLUDED.as_of_date,
            published_at = EXCLUDED.published_at,
            total_operating = EXCLUDED.total_operating,
            total_capital = EXCLUDED.total_capital,
            total_budget = EXCLUDED.total_budget,
            total_employees = EXCLUDED.total_employees,
            budget_in_brief_url = EXCLUDED.budget_in_brief_url,
            volume_1_url = EXCLUDED.volume_1_url,
            volume_2_url = EXCLUDED.volume_2_url,
            volume_3_url = EXCLUDED.volume_3_url,
            updated_at = NOW()
    """, (
        fiscal_year_id,
        stage,
        metadata.get("as_of_date"),
        metadata.get("published_at"),
        totals.get("operating_cents"),
        totals.get("capital_cents"),
        totals.get("total_cents"),
        totals.get("employees"),
        metadata.get("budget_in_brief_url"),
        metadata.get("volume_1_url"),
        metadata.get("volume_2_url"),
        metadata.get("volume_3_url"),
    ))
    cur.close()
    logger.info(
        "Seeded %s budget release for fiscal_year_id=%d",
        stage, fiscal_year_id,
    )


def seed_department_budgets(conn, fiscal_year_id: int,
                            departments: list[dict],
                            stage: str = 'adopted'):
    """Seed department budget records for a fiscal year.

    Idempotent: deletes existing records for the fiscal year and stage
    before inserting. Uses fuzzy name matching (ILIKE) to resolve
    department names from the PDF to database department records.

    Args:
        conn: psycopg2 connection.
        fiscal_year_id: ID of the target fiscal year.
        departments: List of dicts from extraction, each with keys:
            name, operating_budget, capital_budget, total_budget,
            employee_count, strategic_area.
        stage: Budget stage for the rows ('adopted' or 'proposed').
    """
    cur = conn.cursor()

    # Delete existing records for this fiscal year and stage only --
    # a stage-scoped delete can never wipe another stage's rows
    cur.execute(
        "DELETE FROM department_budgets "
        "WHERE fiscal_year_id = %s AND stage = %s",
        (fiscal_year_id, stage)
    )

    # Build department name -> id lookup
    dept_lookup = _build_department_lookup(cur)

    seeded = 0
    skipped = 0

    for dept in departments:
        name = clean_department_name(dept.get("name", ""))
        department_id = _resolve_department_id(name, dept_lookup)

        if department_id is None:
            logger.warning(
                "Could not match department '%s' to database -- skipping", name
            )
            skipped += 1
            continue

        operating = dollars_to_cents(dept.get("operating_budget"))
        capital = dollars_to_cents(dept.get("capital_budget"))
        total = dollars_to_cents(dept.get("total_budget"))

        # If total not provided, compute from operating + capital
        if total == 0 and (operating != 0 or capital != 0):
            total = operating + capital

        employee_count = clean_employee_count(dept.get("employee_count"))

        cur.execute("""
            INSERT INTO department_budgets
                (fiscal_year_id, department_id, operating_budget,
                 capital_budget, total_budget, employee_count, stage)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            fiscal_year_id, department_id, operating, capital,
            total, employee_count, stage,
        ))
        seeded += 1

    cur.close()
    logger.info(
        "Seeded %d department budgets (%d skipped) for fiscal_year_id=%d",
        seeded, skipped, fiscal_year_id
    )


def seed_strategic_area_budgets(conn, fiscal_year_id: int,
                                areas: list[dict],
                                penny: list[dict] = None,
                                stage: str = 'adopted'):
    """Seed strategic area budget records for a fiscal year.

    Idempotent: deletes existing records for the fiscal year and stage
    before inserting.

    Args:
        conn: psycopg2 connection.
        fiscal_year_id: ID of the target fiscal year.
        areas: List of dicts from extraction, each with keys:
            name, operating_budget, capital_budget, total_budget.
        penny: Optional list of dicts from penny extraction, each with keys:
            area, cents. Used to populate cents_per_dollar.
        stage: Budget stage for the rows ('adopted' or 'proposed').
    """
    cur = conn.cursor()

    # Delete existing records for this fiscal year and stage only
    cur.execute(
        "DELETE FROM strategic_area_budgets "
        "WHERE fiscal_year_id = %s AND stage = %s",
        (fiscal_year_id, stage)
    )

    # Build strategic area name -> id lookup
    area_lookup = _build_strategic_area_lookup(cur)

    # Build penny lookup: area name -> cents
    penny_lookup = _build_penny_lookup(penny)

    seeded = 0

    for area in areas:
        name = clean_department_name(area.get("name", ""))
        area_id = _resolve_strategic_area_id(name, area_lookup)

        if area_id is None:
            logger.warning(
                "Could not match strategic area '%s' to database -- skipping",
                name
            )
            continue

        operating = dollars_to_cents(area.get("operating_budget"))
        capital = dollars_to_cents(area.get("capital_budget"))

        # Look up cents_per_dollar from penny data
        cents_per_dollar = penny_lookup.get(name.lower())

        cur.execute("""
            INSERT INTO strategic_area_budgets
                (fiscal_year_id, strategic_area_id, operating_budget,
                 capital_budget, cents_per_dollar, stage)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            fiscal_year_id, area_id, operating, capital, cents_per_dollar,
            stage,
        ))
        seeded += 1

    cur.close()
    logger.info(
        "Seeded %d strategic area budgets for fiscal_year_id=%d",
        seeded, fiscal_year_id
    )


def seed_department_budgets_from_appendix(
    conn, fiscal_year_id: int,
    appendix_c_depts: list[dict],
    appendix_j_depts: list[dict],
    stage: str = 'adopted',
):
    """Seed department budgets using Appendix C (operating) and J (capital).

    Appendix C provides operating budgets per department per strategic area.
    Appendix J provides capital budgets per department per strategic area.
    Values in both are in thousands — use thousands_to_cents().

    Handles multi-area departments: same department can appear in multiple
    strategic areas with different budget rows.

    Idempotent: deletes existing records for the fiscal year and stage
    before inserting.
    """
    cur = conn.cursor()

    # Stage-scoped delete: loading one stage never wipes another stage's rows
    cur.execute(
        "DELETE FROM department_budgets "
        "WHERE fiscal_year_id = %s AND stage = %s",
        (fiscal_year_id, stage)
    )

    dept_lookup = _build_department_lookup(cur)
    area_lookup = _build_strategic_area_lookup(cur)

    seeded = 0
    skipped = 0

    # Index appendix J by (dept_name_lower, area_name_lower) -> capital
    j_lookup = {}
    for jd in appendix_j_depts:
        dept_name = clean_department_name(jd.get("department", ""))
        area_name = clean_department_name(jd.get("strategic_area", ""))
        capital = thousands_to_cents(jd.get("total_25_26"))
        key = (dept_name.lower(), area_name.lower())
        j_lookup[key] = j_lookup.get(key, 0) + capital

    # Insert from Appendix C (operating) and merge capital from J
    for dept in appendix_c_depts:
        dept_name = clean_department_name(dept.get("department", ""))
        area_name = clean_department_name(dept.get("strategic_area", ""))

        department_id = _resolve_department_id(dept_name, dept_lookup)
        if department_id is None:
            logger.warning(
                "Could not match department '%s' to database -- skipping",
                dept_name,
            )
            skipped += 1
            continue

        strategic_area_id = _resolve_strategic_area_id(area_name, area_lookup)

        operating = thousands_to_cents(dept.get("adopted_25_26"))
        employee_count = clean_employee_count(dept.get("positions_25_26"))

        # Look up capital from Appendix J
        j_key = (dept_name.lower(), area_name.lower())
        capital = j_lookup.pop(j_key, 0)
        total = operating + capital

        cur.execute("""
            INSERT INTO department_budgets
                (fiscal_year_id, department_id, strategic_area_id,
                 operating_budget, capital_budget, total_budget,
                 employee_count, stage)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            fiscal_year_id, department_id, strategic_area_id,
            operating, capital, total, employee_count, stage,
        ))
        seeded += 1

    # Insert remaining J-only departments (capital with no operating match)
    for (dept_lower, area_lower), capital in j_lookup.items():
        if capital == 0:
            continue

        department_id = _resolve_department_id(dept_lower, dept_lookup)
        if department_id is None:
            logger.warning(
                "Appendix J department '%s' not matched -- skipping",
                dept_lower,
            )
            skipped += 1
            continue

        strategic_area_id = _resolve_strategic_area_id(area_lower, area_lookup)

        cur.execute("""
            INSERT INTO department_budgets
                (fiscal_year_id, department_id, strategic_area_id,
                 operating_budget, capital_budget, total_budget,
                 employee_count, stage)
            VALUES (%s, %s, %s, 0, %s, %s, NULL, %s)
        """, (
            fiscal_year_id, department_id, strategic_area_id,
            capital, capital, stage,
        ))
        seeded += 1

    cur.close()
    logger.info(
        "Seeded %d department budgets from appendices (%d skipped) "
        "for fiscal_year_id=%d",
        seeded, skipped, fiscal_year_id
    )


def seed_strategic_area_budgets_from_appendix(
    conn, fiscal_year_id: int,
    c_area_totals: list[dict],
    j_area_totals: list[dict],
    penny: list[dict] = None,
    stage: str = 'adopted',
):
    """Seed strategic area budgets using Appendix C and J area totals.

    Appendix C provides operating totals per area, Appendix J provides
    capital totals per area. Both in thousands.

    Idempotent: deletes existing records for the fiscal year and stage
    before inserting.
    """
    cur = conn.cursor()

    # Stage-scoped delete: loading one stage never wipes another stage's rows
    cur.execute(
        "DELETE FROM strategic_area_budgets "
        "WHERE fiscal_year_id = %s AND stage = %s",
        (fiscal_year_id, stage)
    )

    area_lookup = _build_strategic_area_lookup(cur)

    # Build J capital lookup: normalized area name -> capital cents
    j_cap_lookup = {}
    for jt in j_area_totals:
        area_name = clean_department_name(jt.get("strategic_area", ""))
        capital = thousands_to_cents(jt.get("total_25_26"))
        j_cap_lookup[area_name.lower()] = capital

    # Build penny lookup: area name -> cents
    penny_lookup = _build_penny_lookup(penny)

    seeded = 0

    for area in c_area_totals:
        name = clean_department_name(area.get("strategic_area", ""))
        area_id = _resolve_strategic_area_id(name, area_lookup)

        if area_id is None:
            logger.warning(
                "Could not match strategic area '%s' to database -- skipping",
                name,
            )
            continue

        operating = thousands_to_cents(area.get("adopted_25_26"))
        capital = j_cap_lookup.get(name.lower(), 0)
        cents_per_dollar = penny_lookup.get(name.lower())

        cur.execute("""
            INSERT INTO strategic_area_budgets
                (fiscal_year_id, strategic_area_id, operating_budget,
                 capital_budget, cents_per_dollar, stage)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            fiscal_year_id, area_id, operating, capital, cents_per_dollar,
            stage,
        ))
        seeded += 1

    cur.close()
    logger.info(
        "Seeded %d strategic area budgets from appendices for fiscal_year_id=%d",
        seeded, fiscal_year_id
    )


def seed_revenue(conn, fiscal_year_id: int, revenue: list[dict],
                 stage: str = 'adopted'):
    """Seed revenue by source records for a fiscal year.

    Idempotent: deletes existing records for the fiscal year and stage
    before inserting.

    Args:
        conn: psycopg2 connection.
        fiscal_year_id: ID of the target fiscal year.
        revenue: List of dicts from extraction, each with keys:
            source, amount, percentage.
        stage: Budget stage for the rows ('adopted' or 'proposed').
    """
    cur = conn.cursor()

    # Delete existing records for this fiscal year and stage only
    cur.execute(
        "DELETE FROM revenue_by_source "
        "WHERE fiscal_year_id = %s AND stage = %s",
        (fiscal_year_id, stage)
    )

    # Build revenue source name -> id lookup
    source_lookup = _build_revenue_source_lookup(cur)

    seeded = 0

    for rev in revenue:
        source_name = clean_department_name(rev.get("source", ""))
        source_id = _resolve_revenue_source_id(source_name, source_lookup)

        if source_id is None:
            logger.warning(
                "Could not match revenue source '%s' to database -- skipping",
                source_name
            )
            continue

        amount = dollars_to_cents(rev.get("amount"))
        percentage = clean_percentage(rev.get("percentage"))

        cur.execute("""
            INSERT INTO revenue_by_source
                (fiscal_year_id, revenue_source_id, amount, percentage,
                 stage)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            fiscal_year_id, source_id, amount, percentage, stage,
        ))
        seeded += 1

    cur.close()
    logger.info(
        "Seeded %d revenue sources for fiscal_year_id=%d",
        seeded, fiscal_year_id
    )


def seed_millage_rates(conn, fiscal_year_id: int, rates: list[dict],
                       stage: str = 'adopted'):
    """Seed millage rate records for a fiscal year.

    Idempotent: deletes existing records for the fiscal year and stage
    before inserting.

    Args:
        conn: psycopg2 connection.
        fiscal_year_id: ID of the target fiscal year.
        rates: List of dicts from extraction, each with keys:
            authority, millage_rate, is_county.
        stage: Budget stage for the rows ('adopted' or 'proposed').
    """
    cur = conn.cursor()

    # Delete existing records for this fiscal year and stage only
    cur.execute(
        "DELETE FROM millage_rates "
        "WHERE fiscal_year_id = %s AND stage = %s",
        (fiscal_year_id, stage)
    )

    seeded = 0

    for i, rate in enumerate(rates):
        authority = clean_department_name(rate.get("authority", ""))
        if not authority:
            continue

        rate_str = str(rate.get("millage_rate", "0")).strip()
        try:
            millage_rate = Decimal(rate_str)
        except Exception:
            logger.warning(
                "Invalid millage rate '%s' for '%s' -- skipping",
                rate_str, authority
            )
            continue

        is_county = rate.get("is_county", True)

        cur.execute("""
            INSERT INTO millage_rates
                (fiscal_year_id, authority, millage_rate, is_county,
                 display_order, stage)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (fiscal_year_id, authority, stage) DO UPDATE SET
                millage_rate = EXCLUDED.millage_rate,
                is_county = EXCLUDED.is_county,
                display_order = EXCLUDED.display_order
        """, (
            fiscal_year_id, authority, millage_rate, is_county, i + 1,
            stage,
        ))
        seeded += 1

    cur.close()
    logger.info(
        "Seeded %d millage rates for fiscal_year_id=%d",
        seeded, fiscal_year_id
    )


def seed_all(conn, data: dict, fiscal_year_label: str = "FY 2025-26",
             start_date: str = "2025-10-01", end_date: str = "2026-09-30",
             stage: str = 'adopted'):
    """Orchestrate all seed functions in order.

    Wraps everything in a single transaction. The caller is responsible
    for managing the connection (commit/rollback).

    Args:
        conn: psycopg2 connection (autocommit must be False).
        data: Output dict from extract_all() with keys:
            strategic_areas, departments, revenue, millage, penny.
        fiscal_year_label: Fiscal year label (default 'FY 2025-26').
        start_date: Fiscal year start date (default '2025-10-01').
        end_date: Fiscal year end date (default '2026-09-30').
        stage: Budget stage written on every row (default 'adopted';
            Phase 8 passes 'proposed' for FY 2026-27 proposed data).

    Returns:
        Dict with seed counts for each data type.
    """
    from pipeline.config import (
        PDF_URL,
        PUBLISHED_OPERATING_CENTS,
        PUBLISHED_CAPITAL_CENTS,
        PUBLISHED_TOTAL_BUDGET_CENTS,
        PUBLISHED_TOTAL_EMPLOYEES,
    )

    release = data.get("release") or {}
    if stage == 'adopted':
        totals = {
            "operating_cents": release.get(
                "operating_cents", PUBLISHED_OPERATING_CENTS
            ),
            "capital_cents": release.get(
                "capital_cents", PUBLISHED_CAPITAL_CENTS
            ),
            "total_cents": release.get(
                "total_cents", PUBLISHED_TOTAL_BUDGET_CENTS
            ),
            "employees": release.get(
                "employees", PUBLISHED_TOTAL_EMPLOYEES
            ),
        }
        release.setdefault("budget_in_brief_url", PDF_URL)
    else:
        required_totals = (
            "operating_cents", "capital_cents", "total_cents", "employees"
        )
        missing = [key for key in required_totals if release.get(key) is None]
        if missing:
            raise ValueError(
                f"{stage} load requires explicit release totals: "
                + ", ".join(missing)
            )
        totals = {key: release[key] for key in required_totals}

    fiscal_year_id = seed_fiscal_year(
        conn, fiscal_year_label, start_date, end_date, totals,
        is_adopted=(stage == 'adopted'),
    )
    seed_budget_release(conn, fiscal_year_id, stage, totals, release)

    # Determine data source: appendix (authoritative) or BIB-only
    appendix_c = data.get("appendix_c")
    appendix_j = data.get("appendix_j")
    penny = data.get("penny", [])

    if appendix_c:
        # Appendix path: use C for operating, J for capital
        c_depts = appendix_c.get("departments", [])
        c_areas = appendix_c.get("area_totals", [])
        j_depts = appendix_j.get("departments", []) if appendix_j else []
        j_areas = appendix_j.get("area_totals", []) if appendix_j else []

        # Step 2: Seed strategic area budgets from appendices
        seed_strategic_area_budgets_from_appendix(
            conn, fiscal_year_id, c_areas, j_areas, penny, stage=stage
        )

        # Step 3: Seed department budgets from appendices
        seed_department_budgets_from_appendix(
            conn, fiscal_year_id, c_depts, j_depts, stage=stage
        )

        dept_count = len(c_depts)
        area_count = len(c_areas)
    else:
        # BIB-only path (backward compatible)
        strategic_areas = data.get("strategic_areas", [])
        seed_strategic_area_budgets(
            conn, fiscal_year_id, strategic_areas, penny, stage=stage
        )

        departments = data.get("departments", [])
        seed_department_budgets(conn, fiscal_year_id, departments, stage=stage)

        dept_count = len(departments)
        area_count = len(strategic_areas)

    # Step 4: Seed revenue
    revenue = data.get("revenue", [])
    seed_revenue(conn, fiscal_year_id, revenue, stage=stage)

    # Step 5: Seed millage rates
    millage = data.get("millage", [])
    seed_millage_rates(conn, fiscal_year_id, millage, stage=stage)

    return {
        "fiscal_year_id": fiscal_year_id,
        "strategic_areas": area_count,
        "departments": dept_count,
        "revenue": len(revenue),
        "millage": len(millage),
    }


# ============================================================
# Internal lookup and matching helpers
# ============================================================


def _build_penny_lookup(penny: list[dict] | None) -> dict:
    """Build a dict mapping lowercase strategic area name to cents per dollar.

    Handles both extraction key conventions:
      - "area" / "cents" (legacy BIB format)
      - "strategic_area" / "cents_per_dollar" (current format)

    Args:
        penny: List of dicts from penny extraction.

    Returns:
        Dict mapping lowercase area name -> int cents value.
    """
    lookup = {}
    if not penny:
        return lookup

    for p in penny:
        # Support both key conventions
        area_name = clean_department_name(
            p.get("strategic_area", "") or p.get("area", "")
        )
        cents_val = p.get("cents_per_dollar") or p.get("cents")
        if area_name and cents_val is not None:
            try:
                lookup[area_name.lower()] = int(str(cents_val).strip())
            except (ValueError, TypeError):
                pass

    return lookup


def _build_department_lookup(cur) -> dict:
    """Build a dict mapping lowercase department name/slug to id.

    Also includes department aliases for cross-year matching.

    Args:
        cur: psycopg2 cursor.

    Returns:
        Dict mapping lowercase name -> department_id.
    """
    lookup = {}

    # Primary department names and slugs
    cur.execute("SELECT id, name, slug FROM departments")
    for row in cur.fetchall():
        dept_id, name, slug = row
        lookup[name.lower()] = dept_id
        lookup[slug.lower()] = dept_id

    # Department aliases (for historical name matching)
    try:
        cur.execute(
            "SELECT current_department_id, historical_name "
            "FROM department_aliases"
        )
        for row in cur.fetchall():
            dept_id, hist_name = row
            lookup[hist_name.lower()] = dept_id
    except Exception:
        # department_aliases table may not exist yet
        pass

    return lookup


def _resolve_department_id(name: str, lookup: dict) -> int | None:
    """Resolve a department name to a database id.

    Tries exact match first, then fuzzy matching with common variations.

    Args:
        name: Department name from PDF extraction.
        lookup: Dict mapping lowercase name -> department_id.

    Returns:
        department_id or None if no match found.
    """
    if not name:
        return None

    key = name.lower().strip()

    # Exact match
    if key in lookup:
        return lookup[key]

    # Try with common variations
    # Remove possessive apostrophe differences
    key_normalized = key.replace("\u2019", "'")
    if key_normalized in lookup:
        return lookup[key_normalized]

    # Try replacing & with 'and' and vice versa
    if "&" in key:
        alt = key.replace("&", "and")
        if alt in lookup:
            return lookup[alt]
    elif " and " in key:
        alt = key.replace(" and ", " & ")
        if alt in lookup:
            return lookup[alt]

    # Substring matching: check if name is contained in any lookup key
    for lk_name, lk_id in lookup.items():
        if key in lk_name or lk_name in key:
            return lk_id

    return None


def _build_strategic_area_lookup(cur) -> dict:
    """Build a dict mapping lowercase strategic area name/slug to id.

    Args:
        cur: psycopg2 cursor.

    Returns:
        Dict mapping lowercase name -> strategic_area_id.
    """
    lookup = {}

    cur.execute("SELECT id, name, slug FROM strategic_areas")
    for row in cur.fetchall():
        area_id, name, slug = row
        lookup[name.lower()] = area_id
        lookup[slug.lower()] = area_id

    return lookup


def _resolve_strategic_area_id(name: str, lookup: dict) -> int | None:
    """Resolve a strategic area name to a database id.

    Args:
        name: Strategic area name from PDF extraction.
        lookup: Dict mapping lowercase name -> strategic_area_id.

    Returns:
        strategic_area_id or None if no match found.
    """
    if not name:
        return None

    key = name.lower().strip()

    # Exact match
    if key in lookup:
        return lookup[key]

    # Try & vs 'and' variants
    if "&" in key:
        alt = key.replace("&", "and")
        if alt in lookup:
            return lookup[alt]
    elif " and " in key:
        alt = key.replace(" and ", " & ")
        if alt in lookup:
            return lookup[alt]

    return None


def _build_revenue_source_lookup(cur) -> dict:
    """Build a dict mapping lowercase revenue source name/slug to id.

    Args:
        cur: psycopg2 cursor.

    Returns:
        Dict mapping lowercase name -> revenue_source_id.
    """
    lookup = {}

    cur.execute("SELECT id, name, slug FROM revenue_sources")
    for row in cur.fetchall():
        source_id, name, slug = row
        lookup[name.lower()] = source_id
        lookup[slug.lower()] = source_id

    return lookup


def _resolve_revenue_source_id(name: str, lookup: dict) -> int | None:
    """Resolve a revenue source name to a database id.

    Args:
        name: Revenue source name from PDF extraction.
        lookup: Dict mapping lowercase name -> revenue_source_id.

    Returns:
        revenue_source_id or None if no match found.
    """
    if not name:
        return None

    key = name.lower().strip()

    # Exact match
    if key in lookup:
        return lookup[key]

    # Try & vs 'and' variants
    if "&" in key:
        alt = key.replace("&", "and")
        if alt in lookup:
            return lookup[alt]
    elif " and " in key:
        alt = key.replace(" and ", " & ")
        if alt in lookup:
            return lookup[alt]

    # Substring matching for partial names
    for lk_name, lk_id in lookup.items():
        if key in lk_name or lk_name in key:
            return lk_id

    return None
