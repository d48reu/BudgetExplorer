"""Historical data seeder with department alias resolution.

Seeds prior fiscal year budget data from CSV/JSON files into the
department_budgets table. Handles department name resolution including
renamed departments via the department_aliases table.

Usage:
    seed_historical_year(conn, "FY 2021-22", data)
    seed_all_historical(conn, "pipeline/data/historical/")
"""

import glob
import logging
import os
import re

from pipeline.transform.historical import (
    parse_historical_csv,
    parse_historical_json,
    detect_format,
)

logger = logging.getLogger(__name__)


def _record_stage(record: dict) -> str:
    """Map a historical record's legacy boolean to a budget stage.

    The CSV files and transform/historical.py keep the is_actual column
    name; this is the single place the load layer reads it. Everything
    downstream speaks stage ('actual' or 'adopted').
    """
    return "actual" if record.get("is_actual", False) else "adopted"


def resolve_strategic_area(conn, name: str) -> int | None:
    """Resolve a strategic area name to a database ID.

    Args:
        conn: psycopg2 connection.
        name: Strategic area name from the historical data file.

    Returns:
        strategic_area_id or None if no match found.
    """
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM strategic_areas WHERE LOWER(name) = LOWER(%s)",
        (name,),
    )
    row = cur.fetchone()
    cur.close()
    if row:
        return row[0]
    logger.warning("Could not resolve strategic area '%s'", name)
    return None


def resolve_department(
    conn, name: str, alias: str | None
) -> int | None:
    """Resolve a department name to a database ID.

    Tries multiple matching strategies:
      1. Exact match on departments.name (case-insensitive)
      2. Match on departments.slug
      3. If alias provided, match alias against departments.name
      4. Check department_aliases.historical_name

    Args:
        conn: psycopg2 connection.
        name: Department name from the historical data file.
        alias: Current department name (if renamed), or None.

    Returns:
        department_id or None if no match found.
    """
    cur = conn.cursor()

    # Strategy 1: Exact match on departments.name (case-insensitive)
    cur.execute(
        "SELECT id FROM departments WHERE LOWER(name) = LOWER(%s)",
        (name,),
    )
    row = cur.fetchone()
    if row:
        cur.close()
        return row[0]

    # Strategy 2: Match on departments.slug
    # Convert name to slug-like format for matching
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    cur.execute(
        "SELECT id FROM departments WHERE slug = %s",
        (slug,),
    )
    row = cur.fetchone()
    if row:
        cur.close()
        return row[0]

    # Strategy 3: If alias provided, match alias against departments.name
    if alias:
        cur.execute(
            "SELECT id FROM departments WHERE LOWER(name) = LOWER(%s)",
            (alias,),
        )
        row = cur.fetchone()
        if row:
            cur.close()
            return row[0]

    # Strategy 4: Check department_aliases.historical_name
    try:
        cur.execute(
            "SELECT current_department_id FROM department_aliases "
            "WHERE LOWER(historical_name) = LOWER(%s)",
            (name,),
        )
        row = cur.fetchone()
        if row:
            cur.close()
            return row[0]
    except Exception:
        # department_aliases table may not exist yet
        pass

    cur.close()
    logger.warning("Could not resolve department '%s' (alias: %s)", name, alias)
    return None


def seed_historical_year(
    conn, fiscal_year_label: str, data: list[dict]
):
    """Seed historical budget data for a single fiscal year.

    Idempotent: deletes existing department_budgets for this fiscal year
    before inserting new records.

    Args:
        conn: psycopg2 connection.
        fiscal_year_label: Fiscal year label (e.g., 'FY 2021-22').
        data: List of dicts from parse_historical_csv/json, each with:
            department_name, department_alias, operating_budget_cents,
            capital_budget_cents, total_budget_cents, employee_count,
            is_actual.
    """
    cur = conn.cursor()

    # Create or get fiscal_year record
    # Derive start_date/end_date from label pattern "FY YYYY-YY"
    match = re.search(r"(\d{4})", fiscal_year_label)
    if match:
        start_year = int(match.group(1))
    else:
        logger.error(
            "Cannot parse fiscal year from label '%s'", fiscal_year_label
        )
        cur.close()
        return

    start_date = f"{start_year}-10-01"
    end_date = f"{start_year + 1}-09-30"

    cur.execute(
        """
        INSERT INTO fiscal_years (label, start_date, end_date, is_adopted)
        VALUES (%s, %s, %s, TRUE)
        ON CONFLICT (label) DO UPDATE SET
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date
        RETURNING id
        """,
        (fiscal_year_label, start_date, end_date),
    )
    fiscal_year_id = cur.fetchone()[0]

    # Delete existing department_budgets for this fiscal year (idempotent),
    # scoped to the stages actually present in the incoming data so a
    # historical reseed can never wipe rows from another stage
    stages_in_data = sorted({_record_stage(record) for record in data})
    for stg in stages_in_data:
        cur.execute(
            "DELETE FROM department_budgets "
            "WHERE fiscal_year_id = %s AND stage = %s",
            (fiscal_year_id, stg),
        )

    seeded = 0
    skipped = 0
    seen_keys: set = set()

    for record in data:
        dept_name = record["department_name"]
        dept_alias = record.get("department_alias")
        strategic_area_name = record.get("strategic_area", "")

        department_id = resolve_department(conn, dept_name, dept_alias)

        if department_id is None:
            logger.warning(
                "Skipping '%s' for %s (unresolved department)",
                dept_name, fiscal_year_label,
            )
            skipped += 1
            continue

        # Resolve strategic area (required by unique constraint)
        strategic_area_id = None
        if strategic_area_name:
            strategic_area_id = resolve_strategic_area(
                conn, strategic_area_name
            )

        # Aliases can resolve several historical names to one current
        # department; conflicting rows must SUM, not overwrite, or one
        # predecessor's budget silently disappears.
        stage = _record_stage(record)
        key = (department_id, strategic_area_id, stage)
        if key in seen_keys:
            logger.warning(
                "%s: multiple rows resolve to the same department in one "
                "strategic area ('%s') -- summing budgets",
                fiscal_year_label, dept_name,
            )
        seen_keys.add(key)

        cur.execute(
            """
            INSERT INTO department_budgets
                (fiscal_year_id, department_id, strategic_area_id,
                 operating_budget, capital_budget, total_budget,
                 employee_count, stage)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (fiscal_year_id, department_id, strategic_area_id, stage)
            DO UPDATE SET
                operating_budget = COALESCE(department_budgets.operating_budget, 0)
                    + COALESCE(EXCLUDED.operating_budget, 0),
                capital_budget = COALESCE(department_budgets.capital_budget, 0)
                    + COALESCE(EXCLUDED.capital_budget, 0),
                total_budget = COALESCE(department_budgets.total_budget, 0)
                    + COALESCE(EXCLUDED.total_budget, 0),
                employee_count = CASE
                    WHEN department_budgets.employee_count IS NULL
                         AND EXCLUDED.employee_count IS NULL THEN NULL
                    ELSE COALESCE(department_budgets.employee_count, 0)
                         + COALESCE(EXCLUDED.employee_count, 0)
                END
            """,
            (
                fiscal_year_id,
                department_id,
                strategic_area_id,
                record["operating_budget_cents"],
                record["capital_budget_cents"],
                record["total_budget_cents"],
                record.get("employee_count"),
                stage,
            ),
        )
        seeded += 1

    cur.close()
    conn.commit()

    logger.info(
        "Seeded %d departments for %s (%d skipped)",
        seeded, fiscal_year_label, skipped,
    )
    print(
        f"  {fiscal_year_label}: {seeded} departments seeded, "
        f"{skipped} skipped (unresolved)"
    )


def seed_all_historical(conn, data_dir: str):
    """Scan a directory for historical CSV/JSON files and seed each one.

    Looks for files matching the pattern fy_*_departments.* (CSV or JSON).

    Args:
        conn: psycopg2 connection.
        data_dir: Path to directory containing historical data files.
    """
    # Find CSV and JSON files matching the naming convention
    csv_files = glob.glob(os.path.join(data_dir, "fy_*_departments.csv"))
    json_files = glob.glob(os.path.join(data_dir, "fy_*_departments.json"))

    all_files = sorted(csv_files + json_files)

    if not all_files:
        print(f"No historical data files found in {data_dir}")
        print(
            "Expected files named fy_YYYY_YY_departments.csv or "
            "fy_YYYY_YY_departments.json"
        )
        return

    print(f"Found {len(all_files)} historical data file(s)")

    for file_path in all_files:
        filename = os.path.basename(file_path)
        print(f"\nProcessing: {filename}")

        # Detect format and parse
        fmt = detect_format(file_path)
        if fmt == "csv":
            data = parse_historical_csv(file_path)
        else:
            data = parse_historical_json(file_path)

        if not data:
            print(f"  No records found in {filename}")
            continue

        # Extract fiscal year from the data (use first record's fiscal_year)
        fiscal_year_label = data[0]["fiscal_year"]
        print(f"  Fiscal year: {fiscal_year_label}")
        print(f"  Records: {len(data)}")

        seed_historical_year(conn, fiscal_year_label, data)

    print(f"\nSeeded {len(all_files)} historical file(s)")
