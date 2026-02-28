"""Click CLI entry point for the Miami-Dade Budget Explorer data pipeline.

Commands:
    extract              - Extract budget data from the Budget in Brief PDF
    load                 - Load extracted data into PostgreSQL
    verify               - Verify database totals against published figures
    run-all              - Run the complete pipeline: extract -> load -> verify
    migrate              - Run database migrations only
    seed-historical      - Seed all historical data from a directory
    seed-historical-file - Seed historical data from a single file
"""

import json
import os
import sys

import click

from pipeline.config import PDF_PATH, PDF_URL, CURRENT_FISCAL_YEAR


@click.group()
def cli():
    """Miami-Dade Budget Explorer - Data Pipeline

    Extracts budget data from the FY 2025-26 Budget in Brief PDF,
    loads it into PostgreSQL, and verifies against published totals.
    """
    pass


@cli.command()
@click.option(
    "--pdf",
    default=None,
    help="Path to Budget in Brief PDF or URL. Defaults to config PDF_PATH or PDF_URL.",
)
@click.option(
    "--output",
    default="extracted_data.json",
    help="Output JSON file for extracted data.",
)
def extract(pdf, output):
    """Extract budget data from the Budget in Brief PDF."""
    from pipeline.extract import extract_all, download_pdf
    from pipeline.transform.validate import (
        validate_extracted_data,
        validate_totals_rough,
    )

    source = pdf or PDF_PATH

    # Download PDF if source is a URL
    if source.startswith("http"):
        click.echo(f"Downloading PDF from: {source}")
        source = download_pdf(source)
    elif not os.path.exists(source):
        # Try downloading from default URL
        click.echo(f"PDF not found at {source}, downloading from {PDF_URL}...")
        source = download_pdf(PDF_URL)

    click.echo(f"Extracting budget data from: {source}")

    # Run extraction
    data = extract_all(source)

    # Validate structural integrity
    click.echo("\nValidating extracted data...")
    issues = validate_extracted_data(data)

    errors = [i for i in issues if i.startswith("ERROR")]
    warnings = [i for i in issues if i.startswith("WARNING")]

    for w in warnings:
        click.echo(f"  {w}")

    if errors:
        for e in errors:
            click.echo(f"  {e}", err=True)
        click.echo(
            f"\n{len(errors)} error(s) found. Fix extraction before loading.",
            err=True,
        )
        sys.exit(1)

    # Run rough total sanity check
    total_warnings = validate_totals_rough(data)
    for w in total_warnings:
        click.echo(f"  {w}")

    # Write output JSON
    with open(output, "w") as f:
        json.dump(data, f, indent=2, default=str)

    click.echo(f"\nExtracted data written to: {output}")
    click.echo(f"  Strategic areas: {len(data.get('strategic_areas', []))}")
    click.echo(f"  Departments: {len(data.get('departments', []))}")
    click.echo(f"  Revenue sources: {len(data.get('revenue', []))}")
    click.echo(f"  Millage rates: {len(data.get('millage', []))}")
    click.echo(f"  Penny entries: {len(data.get('penny', []))}")


@cli.command()
@click.option(
    "--data",
    required=True,
    type=click.Path(exists=True),
    help="Path to extracted data JSON file.",
)
@click.option(
    "--fiscal-year",
    default=CURRENT_FISCAL_YEAR,
    help="Fiscal year label (e.g., 'FY 2025-26').",
)
def load(data, fiscal_year):
    """Load extracted data into PostgreSQL.

    Runs migrations first, then seeds all data into the database.
    All monetary values are converted to BigInt cents before insertion.
    """
    from pipeline.load.db import get_db_connection, run_migrations
    from pipeline.load.seed import seed_all

    click.echo(f"Loading data from: {data}")
    click.echo(f"Target fiscal year: {fiscal_year}")

    # Read extracted JSON
    with open(data) as f:
        extracted = json.load(f)

    # Run migrations first
    click.echo("\nRunning database migrations...")
    run_migrations()

    # Determine fiscal year dates
    start_date, end_date = _fiscal_year_dates(fiscal_year)

    # Seed all data in a single transaction
    click.echo("\nSeeding database...")
    with get_db_connection() as conn:
        counts = seed_all(
            conn, extracted,
            fiscal_year_label=fiscal_year,
            start_date=start_date,
            end_date=end_date,
        )

    click.echo("\nSeeding complete:")
    click.echo(f"  Fiscal year ID: {counts['fiscal_year_id']}")
    click.echo(f"  Strategic areas: {counts['strategic_areas']}")
    click.echo(f"  Departments: {counts['departments']}")
    click.echo(f"  Revenue sources: {counts['revenue']}")
    click.echo(f"  Millage rates: {counts['millage']}")


@cli.command()
@click.option(
    "--fiscal-year",
    default=CURRENT_FISCAL_YEAR,
    help="Fiscal year label to verify (e.g., 'FY 2025-26').",
)
@click.option(
    "--published-totals",
    default=None,
    help="Path to published_totals.json. Defaults to pipeline/data/published_totals.json.",
)
def verify(fiscal_year, published_totals):
    """Verify database totals against published figures.

    Runs two-level verification: grand total and each strategic area subtotal.
    Prints a detailed diff report showing expected vs actual at every level.
    Exits with code 1 if any check fails.
    """
    from pipeline.verify.checker import run_verification

    if published_totals is None:
        published_totals = os.path.join(
            os.path.dirname(__file__), "data", "published_totals.json"
        )

    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        from pipeline.config import DATABASE_URL
        database_url = DATABASE_URL

    click.echo(f"Verifying data for: {fiscal_year}")
    click.echo(f"Published totals: {published_totals}")
    click.echo("")

    all_passed, report = run_verification(
        database_url, fiscal_year, published_totals
    )

    click.echo(report)

    if all_passed:
        click.echo("\nVERIFICATION PASSED")
    else:
        click.echo("\nVERIFICATION FAILED", err=True)
        sys.exit(1)


@cli.command(name="run-all")
@click.option(
    "--pdf",
    default=None,
    help="Path to Budget in Brief PDF or URL.",
)
@click.option(
    "--output",
    default="extracted_data.json",
    help="Intermediate JSON file for extracted data.",
)
@click.option(
    "--fiscal-year",
    default=CURRENT_FISCAL_YEAR,
    help="Fiscal year label.",
)
@click.pass_context
def run_all(ctx, pdf, output, fiscal_year):
    """Run the complete pipeline: extract -> load -> verify.

    Chains all three steps. Verification runs automatically as the final
    step. On verification failure, the pipeline halts with a non-zero
    exit code and a detailed diff report.
    """
    click.echo(f"Running complete pipeline for {fiscal_year}")
    click.echo("=" * 50)

    # Step 1: Extract
    click.echo("\n--- Step 1: Extract ---")
    ctx.invoke(extract, pdf=pdf, output=output)

    # Step 2: Load
    click.echo("\n--- Step 2: Load ---")
    ctx.invoke(load, data=output, fiscal_year=fiscal_year)

    # Step 3: Verify (halts on failure with non-zero exit code)
    click.echo("\n--- Step 3: Verify ---")
    ctx.invoke(verify, fiscal_year=fiscal_year)

    click.echo("\n" + "=" * 50)
    click.echo("Pipeline complete.")


@cli.command()
def migrate():
    """Run database migrations only.

    Applies all pending SQL migration files from pipeline/migrations/.
    Safe to run multiple times (idempotent).
    """
    from pipeline.load.db import run_migrations

    click.echo("Running database migrations...")
    run_migrations()
    click.echo("Migrations complete.")


@cli.command(name="seed-historical")
@click.option(
    "--data-dir",
    default=None,
    help="Directory containing historical CSV/JSON files. "
    "Defaults to pipeline/data/historical/.",
)
def seed_historical(data_dir):
    """Seed all historical data from a directory.

    Scans the data directory for files matching fy_*_departments.csv or
    fy_*_departments.json, parses each one, and seeds the data into
    the department_budgets table.
    """
    from pipeline.load.db import get_db_connection, run_migrations
    from pipeline.load.seed_historical import seed_all_historical

    if data_dir is None:
        data_dir = os.path.join(
            os.path.dirname(__file__), "data", "historical"
        )

    click.echo(f"Seeding historical data from: {data_dir}")

    # Run migrations first
    click.echo("Running database migrations...")
    run_migrations()

    with get_db_connection() as conn:
        seed_all_historical(conn, data_dir)

    click.echo("\nHistorical seeding complete.")


@cli.command(name="seed-historical-file")
@click.option(
    "--file",
    "file_path",
    required=True,
    type=click.Path(exists=True),
    help="Path to a single CSV or JSON file with historical data.",
)
@click.option(
    "--fiscal-year",
    required=True,
    help="Fiscal year label (e.g., 'FY 2021-22').",
)
def seed_historical_file(file_path, fiscal_year):
    """Seed historical data from a single CSV or JSON file.

    Parses the file and seeds department budget records for the specified
    fiscal year. Idempotent: safe to re-run.
    """
    from pipeline.load.db import get_db_connection, run_migrations
    from pipeline.load.seed_historical import seed_historical_year
    from pipeline.transform.historical import (
        parse_historical_csv,
        parse_historical_json,
        detect_format,
    )

    click.echo(f"Seeding from: {file_path}")
    click.echo(f"Fiscal year: {fiscal_year}")

    # Run migrations first
    click.echo("Running database migrations...")
    run_migrations()

    # Parse the file
    fmt = detect_format(file_path)
    if fmt == "csv":
        data = parse_historical_csv(file_path)
    else:
        data = parse_historical_json(file_path)

    click.echo(f"Parsed {len(data)} records")

    # Seed
    with get_db_connection() as conn:
        seed_historical_year(conn, fiscal_year, data)

    click.echo("\nHistorical seeding complete.")


def _fiscal_year_dates(label: str) -> tuple[str, str]:
    """Convert a fiscal year label to start and end dates.

    Miami-Dade fiscal year runs October 1 through September 30.

    Args:
        label: Fiscal year label (e.g., 'FY 2025-26').

    Returns:
        Tuple of (start_date, end_date) as ISO date strings.
    """
    # Extract the start year from the label (e.g., '2025' from 'FY 2025-26')
    import re
    match = re.search(r"(\d{4})", label)
    if match:
        start_year = int(match.group(1))
    else:
        # Default to FY 2025-26
        start_year = 2025

    return f"{start_year}-10-01", f"{start_year + 1}-09-30"


if __name__ == "__main__":
    cli()
