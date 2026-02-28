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

    # Delete existing department_budgets for this fiscal year (idempotent)
    cur.execute(
        "DELETE FROM department_budgets WHERE fiscal_year_id = %s",
        (fiscal_year_id,),
    )

    seeded = 0
    skipped = 0

    for record in data:
        dept_name = record["department_name"]
        dept_alias = record.get("department_alias")

        department_id = resolve_department(conn, dept_name, dept_alias)

        if department_id is None:
            logger.warning(
                "Skipping '%s' for %s (unresolved department)",
                dept_name, fiscal_year_label,
            )
            skipped += 1
            continue

        cur.execute(
            """
            INSERT INTO department_budgets
                (fiscal_year_id, department_id, operating_budget,
                 capital_budget, total_budget, employee_count, is_actual)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (fiscal_year_id, department_id, is_actual) DO UPDATE SET
                operating_budget = EXCLUDED.operating_budget,
                capital_budget = EXCLUDED.capital_budget,
                total_budget = EXCLUDED.total_budget,
                employee_count = EXCLUDED.employee_count
            """,
            (
                fiscal_year_id,
                department_id,
                record["operating_budget_cents"],
                record["capital_budget_cents"],
                record["total_budget_cents"],
                record.get("employee_count"),
                record.get("is_actual", False),
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
