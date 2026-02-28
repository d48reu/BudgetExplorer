"""Generate historical fiscal year CSV files from extracted Appendix C data.

Reads extracted_data.json and produces one CSV file per fiscal year (FY 2021-22
through FY 2024-25) in the pipeline/data/historical/ directory, following the
template.csv schema exactly.

The Appendix C data contains operating budget values in thousands of dollars
(e.g., "7,591" means $7,591,000). This script converts those to whole dollars
for the CSV output, which the historical seeding pipeline then converts to cents.

Usage:
    python pipeline/scripts/generate_historical_csvs.py
    python pipeline/scripts/generate_historical_csvs.py --input path/to/extracted_data.json
    python pipeline/scripts/generate_historical_csvs.py --output-dir path/to/output/
"""

import csv
import json
import os
import sys

import click


# Column-to-fiscal-year mapping from Appendix C
FISCAL_YEAR_MAP = {
    "actual_21_22": {
        "fiscal_year": "FY 2021-22",
        "is_actual": "true",
    },
    "actual_22_23": {
        "fiscal_year": "FY 2022-23",
        "is_actual": "true",
    },
    "actual_23_24": {
        "fiscal_year": "FY 2023-24",
        "is_actual": "true",
    },
    "budget_24_25": {
        "fiscal_year": "FY 2024-25",
        "is_actual": "false",
    },
}

# CSV header matching template.csv schema
CSV_HEADER = [
    "fiscal_year",
    "strategic_area",
    "department_name",
    "department_alias",
    "operating_budget",
    "capital_budget",
    "employee_count",
    "is_actual",
]


def parse_thousands_to_dollars(value):
    """Convert a thousands string (e.g., '7,591') to whole dollars (7591000).

    Removes commas, converts to int, multiplies by 1000.

    Args:
        value: String like "7,591" or None/empty.

    Returns:
        Integer in whole dollars, or None if empty/invalid.
    """
    if value is None:
        return None
    val_str = str(value).strip()
    if not val_str or val_str == "0":
        return None
    # Remove commas
    val_str = val_str.replace(",", "")
    try:
        val_int = int(val_str)
    except ValueError:
        return None
    return val_int * 1000


@click.command()
@click.option(
    "--input",
    "input_path",
    default="extracted_data.json",
    type=click.Path(exists=True),
    help="Path to extracted_data.json (default: project root)",
)
@click.option(
    "--output-dir",
    default="pipeline/data/historical/",
    type=click.Path(),
    help="Output directory for CSV files (default: pipeline/data/historical/)",
)
def generate(input_path, output_dir):
    """Generate historical CSV files from extracted Appendix C data."""
    # Read extracted data
    with open(input_path, encoding="utf-8") as f:
        data = json.load(f)

    # Access appendix_c departments
    appendix_c = data.get("appendix_c", {})
    departments = appendix_c.get("departments", [])

    if not departments:
        click.echo("ERROR: No departments found in appendix_c data.", err=True)
        sys.exit(1)

    click.echo(f"Found {len(departments)} departments in Appendix C data")

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Generate one CSV per fiscal year
    for column_key, fy_info in FISCAL_YEAR_MAP.items():
        fiscal_year = fy_info["fiscal_year"]
        is_actual = fy_info["is_actual"]

        # Build rows for this fiscal year
        rows = []
        for dept in departments:
            raw_value = dept.get(column_key)
            operating_budget = parse_thousands_to_dollars(raw_value)

            # Skip rows where operating budget is empty, None, or zero
            if operating_budget is None:
                continue

            rows.append({
                "fiscal_year": fiscal_year,
                "strategic_area": dept.get("strategic_area", ""),
                "department_name": dept.get("department", ""),
                "department_alias": "",
                "operating_budget": operating_budget,
                "capital_budget": 0,
                "employee_count": "",
                "is_actual": is_actual,
            })

        # Derive filename from fiscal year: "FY 2021-22" -> "fy_2021_22_departments.csv"
        fy_slug = fiscal_year.lower().replace(" ", "_").replace("-", "_")
        filename = f"{fy_slug}_departments.csv"
        filepath = os.path.join(output_dir, filename)

        # Write CSV
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, fieldnames=CSV_HEADER, quoting=csv.QUOTE_MINIMAL
            )
            writer.writeheader()
            writer.writerows(rows)

        # Calculate total operating budget for summary
        total_budget = sum(r["operating_budget"] for r in rows)
        total_budget_formatted = f"${total_budget:,.0f}"

        click.echo(
            f"  {filename}: {len(rows)} rows, "
            f"total operating budget: {total_budget_formatted}"
        )

    click.echo(f"\nGenerated {len(FISCAL_YEAR_MAP)} CSV files in {output_dir}")


if __name__ == "__main__":
    generate()
