"""CSV/JSON parser for historical fiscal year budget data.

Reads historical budget data from CSV or JSON files and converts dollar
amounts to cents. Used by the seed_historical module to populate the
database with prior fiscal year data.

CSV/JSON schema:
    fiscal_year, strategic_area, department_name, department_alias,
    operating_budget, capital_budget, employee_count, is_actual
"""

import csv
import json
import logging
import os

from pipeline.transform.clean import dollars_to_cents

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {
    "fiscal_year",
    "strategic_area",
    "department_name",
    "operating_budget",
    "capital_budget",
}


def detect_format(file_path: str) -> str:
    """Detect the file format based on extension.

    Args:
        file_path: Path to the data file.

    Returns:
        "csv" or "json".

    Raises:
        ValueError: If the file extension is not .csv or .json.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        return "csv"
    elif ext == ".json":
        return "json"
    else:
        raise ValueError(
            f"Unsupported file format '{ext}'. Expected .csv or .json."
        )


def parse_historical_csv(csv_path: str) -> list[dict]:
    """Read a historical budget CSV and convert dollar amounts to cents.

    CSV columns: fiscal_year, strategic_area, department_name,
    department_alias, operating_budget, capital_budget, employee_count,
    is_actual.

    The operating_budget and capital_budget are in whole dollars. This
    function converts them to cents using dollars_to_cents().

    Args:
        csv_path: Path to the CSV file.

    Returns:
        List of dicts with keys matching the CSV columns, plus:
            - operating_budget_cents (int)
            - capital_budget_cents (int)
            - total_budget_cents (int)

    Raises:
        ValueError: If required columns are missing.
        FileNotFoundError: If the CSV file does not exist.
    """
    records = []

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        # Validate required columns exist
        if reader.fieldnames is None:
            raise ValueError(f"CSV file {csv_path} has no header row.")

        present = set(reader.fieldnames)
        missing = REQUIRED_COLUMNS - present
        if missing:
            raise ValueError(
                f"CSV file {csv_path} missing required columns: "
                f"{', '.join(sorted(missing))}"
            )

        for i, row in enumerate(reader, start=2):  # start=2 for line number (header is 1)
            record = _parse_row(row, csv_path, i)
            if record is not None:
                records.append(record)

    logger.info("Parsed %d records from %s", len(records), csv_path)
    return records


def parse_historical_json(json_path: str) -> list[dict]:
    """Read a historical budget JSON and convert dollar amounts to cents.

    JSON format: array of objects with the same field names as the CSV
    columns.

    The operating_budget and capital_budget are in whole dollars. This
    function converts them to cents using dollars_to_cents().

    Args:
        json_path: Path to the JSON file.

    Returns:
        List of dicts with converted cent values.

    Raises:
        ValueError: If required fields are missing from any record.
        FileNotFoundError: If the JSON file does not exist.
    """
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError(
            f"JSON file {json_path} must contain an array of objects."
        )

    records = []
    for i, row in enumerate(data, start=1):
        # Validate required fields
        present = set(row.keys())
        missing = REQUIRED_COLUMNS - present
        if missing:
            raise ValueError(
                f"JSON record #{i} in {json_path} missing required fields: "
                f"{', '.join(sorted(missing))}"
            )

        record = _parse_row(row, json_path, i)
        if record is not None:
            records.append(record)

    logger.info("Parsed %d records from %s", len(records), json_path)
    return records


def _parse_row(row: dict, source: str, line_num: int) -> dict | None:
    """Parse a single data row and convert dollar amounts to cents.

    Args:
        row: Dict with raw column values.
        source: Source file path (for error messages).
        line_num: Line/record number (for error messages).

    Returns:
        Parsed dict with cent values, or None if the row should be skipped.
    """
    department_name = str(row.get("department_name", "")).strip()
    if not department_name:
        logger.warning(
            "%s line %d: empty department_name -- skipping", source, line_num
        )
        return None

    operating_cents = dollars_to_cents(row.get("operating_budget"))
    capital_cents = dollars_to_cents(row.get("capital_budget"))
    total_cents = operating_cents + capital_cents

    # Parse employee count
    emp_str = str(row.get("employee_count", "")).strip()
    employee_count = None
    if emp_str and emp_str not in ("", "-", "N/A"):
        try:
            employee_count = int(float(emp_str.replace(",", "")))
        except (ValueError, TypeError):
            pass

    # Parse is_actual flag
    is_actual_str = str(row.get("is_actual", "false")).strip().lower()
    is_actual = is_actual_str in ("true", "1", "yes")

    return {
        "fiscal_year": str(row.get("fiscal_year", "")).strip(),
        "strategic_area": str(row.get("strategic_area", "")).strip(),
        "department_name": department_name,
        "department_alias": str(row.get("department_alias", "")).strip() or None,
        "operating_budget_cents": operating_cents,
        "capital_budget_cents": capital_cents,
        "total_budget_cents": total_cents,
        "employee_count": employee_count,
        "is_actual": is_actual,
    }
