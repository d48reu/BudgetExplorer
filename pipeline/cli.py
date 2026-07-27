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

from pipeline.config import (
    PDF_PATH, PDF_URL, CURRENT_FISCAL_YEAR,
    APPENDIX_C_PATH, APPENDIX_J_PATH,
    APPENDIX_C_URL, APPENDIX_J_URL,
    PROPOSED_BIB_PATH, PROPOSED_VOLUME_1_PATH,
)


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
@click.option(
    "--appendix-c",
    "appendix_c",
    default=None,
    help="Path or URL for Appendix C (operating expenditures). Downloads the official adopted appendix by default.",
)
@click.option(
    "--appendix-j",
    "appendix_j",
    default=None,
    help="Path or URL for Appendix J (capital budget). Downloads the official adopted appendix by default.",
)
def extract(pdf, output, appendix_c, appendix_j):
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

    # Resolve authoritative appendices, downloading the official adopted
    # sources on first run so verification never silently falls back to the
    # incomplete Budget in Brief department totals.
    ac_path = _resolve_appendix(
        appendix_c, APPENDIX_C_PATH, APPENDIX_C_URL,
        "Appendix C", download_pdf,
    )
    aj_path = _resolve_appendix(
        appendix_j, APPENDIX_J_PATH, APPENDIX_J_URL,
        "Appendix J", download_pdf,
    )

    # Run extraction
    data = extract_all(source, appendix_c_path=ac_path, appendix_j_path=aj_path)

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


@cli.command(name="extract-proposed")
@click.option(
    "--budget-in-brief",
    "budget_in_brief",
    default=None,
    help="Local path or URL for the FY 2026-27 proposed Budget in Brief.",
)
@click.option(
    "--volume-1",
    "volume_1",
    default=None,
    help="Local path or URL for FY 2026-27 proposed Volume 1.",
)
@click.option(
    "--output",
    default="pipeline/data/fy_2026_27_proposed.json",
    help="Output path for the extracted proposed dataset.",
)
@click.option(
    "--totals-output",
    default="pipeline/data/fy_2026_27_proposed_totals.json",
    help="Output path for the proposed verification sidecar.",
)
def extract_proposed(budget_in_brief, volume_1, output, totals_output):
    """Extract the FY 2026-27 proposed budget from official PDFs."""
    from pipeline.extract import download_pdf
    from pipeline.extract.proposed import (
        PROPOSED_BIB_URL,
        PROPOSED_VOLUME_1_URL,
        extract_proposed_budget,
        proposed_verification_totals,
    )

    bib_path = _resolve_appendix(
        budget_in_brief,
        PROPOSED_BIB_PATH,
        PROPOSED_BIB_URL,
        "FY 2026-27 proposed Budget in Brief",
        download_pdf,
    )
    volume_1_path = _resolve_appendix(
        volume_1,
        PROPOSED_VOLUME_1_PATH,
        PROPOSED_VOLUME_1_URL,
        "FY 2026-27 proposed Volume 1",
        download_pdf,
    )

    data = extract_proposed_budget(bib_path, volume_1_path)
    totals = proposed_verification_totals(data)
    for path, payload in ((output, data), (totals_output, totals)):
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w") as f:
            json.dump(payload, f, indent=2)

    click.echo(f"Proposed dataset written to: {output}")
    click.echo(f"Verification totals written to: {totals_output}")
    click.echo(f"  Priorities: {len(data['priorities'])}")
    click.echo(f"  Department/priority slices: {len(data['department_budgets'])}")
    click.echo(
        f"  Gross operating: ${data['release']['gross_operating_cents'] / 100:,.0f}"
    )
    click.echo(f"  Capital: ${data['release']['capital_cents'] / 100:,.0f}")


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
@click.option(
    "--stage",
    type=click.Choice(["proposed", "adopted", "actual"]),
    default="adopted",
    show_default=True,
    help="Release stage for every loaded fact and release total.",
)
def load(data, fiscal_year, stage):
    """Load extracted data into PostgreSQL.

    Runs migrations first, then seeds all data into the database.
    All monetary values are converted to BigInt cents before insertion.
    """
    from pipeline.load.db import get_db_connection, run_migrations
    from pipeline.load.seed import seed_all

    click.echo(f"Loading data from: {data}")
    click.echo(f"Target fiscal year: {fiscal_year}")
    click.echo(f"Budget stage: {stage}")

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
        if extracted.get("format") == "proposed-budget-v1":
            if stage != "proposed":
                raise click.ClickException(
                    "proposed-budget-v1 data must be loaded with --stage proposed"
                )
            from pipeline.load.seed_proposed import seed_proposed_all
            counts = seed_proposed_all(conn, extracted)
        else:
            counts = seed_all(
                conn, extracted,
                fiscal_year_label=fiscal_year,
                start_date=start_date,
                end_date=end_date,
                stage=stage,
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
@click.option(
    "--stage",
    type=click.Choice(["proposed", "adopted", "actual"]),
    default="adopted",
    show_default=True,
    help="Release stage to verify.",
)
def verify(fiscal_year, published_totals, stage):
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
    click.echo(f"Budget stage: {stage}")
    click.echo(f"Published totals: {published_totals}")
    click.echo("")

    all_passed, report = run_verification(
        database_url, fiscal_year, published_totals, stage=stage
    )

    click.echo(report)

    if all_passed:
        click.echo("\nVERIFICATION PASSED")
    else:
        click.echo("\nVERIFICATION FAILED", err=True)
        sys.exit(1)


@cli.command(name="audit-numbers")
@click.option(
    "--public-dir",
    default="budget-explorer-web/public/audit",
    show_default=True,
    help="Directory for the public ledger, source manifest, and summary.",
)
@click.option(
    "--site-data",
    default="budget-explorer-web/src/data/budget-audit.json",
    show_default=True,
    help="Generated JSON imported by the public audit page.",
)
@click.option(
    "--strict/--no-strict",
    default=True,
    show_default=True,
    help="Exit non-zero when any exact audit gate fails.",
)
def audit_numbers(public_dir, site_data, strict):
    """Create the exact source-to-database numeric audit artifacts."""
    from pipeline.audit import generate_audit

    click.echo("Building the source-to-database number ledger...")
    summary = generate_audit(
        public_dir=public_dir,
        site_data_path=site_data,
    )
    gate = summary["gate"]
    click.echo(
        f"Audit {gate['status']}: {gate['passed']}/{gate['checks']} exact checks "
        f"passed; monetary variance {gate['exactMonetaryVarianceCents']} cents."
    )
    click.echo(f"Ledger: {os.path.join(public_dir, 'number-ledger.csv')}")

    if strict and gate["status"] != "PASS":
        raise click.ClickException(
            f"{gate['failures']} exact numeric audit check(s) failed"
        )


@cli.command(name="run-all")
@click.option("--pdf", default=None, help="Path to Budget in Brief PDF or URL.")
@click.option("--output", default="extracted_data.json", help="Intermediate JSON file for extracted data.")
@click.option("--fiscal-year", default=CURRENT_FISCAL_YEAR, help="Fiscal year label.")
@click.option("--appendix-c", "appendix_c", default=None, help="Path to Appendix C PDF.")
@click.option("--appendix-j", "appendix_j", default=None, help="Path to Appendix J PDF.")
@click.pass_context
def run_all(ctx, pdf, output, fiscal_year, appendix_c, appendix_j):
    """Run the complete pipeline: extract -> load -> verify.

    Chains all three steps. Verification runs automatically as the final
    step. On verification failure, the pipeline halts with a non-zero
    exit code and a detailed diff report.
    """
    click.echo(f"Running complete pipeline for {fiscal_year}")
    click.echo("=" * 50)

    # Step 1: Extract
    click.echo("\n--- Step 1: Extract ---")
    ctx.invoke(extract, pdf=pdf, output=output, appendix_c=appendix_c, appendix_j=appendix_j)

    # Step 2: Load
    click.echo("\n--- Step 2: Load ---")
    ctx.invoke(load, data=output, fiscal_year=fiscal_year, stage="adopted")

    # Step 3: Verify (halts on failure with non-zero exit code)
    click.echo("\n--- Step 3: Verify ---")
    ctx.invoke(verify, fiscal_year=fiscal_year, stage="adopted")

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


def _resolve_appendix(provided: str | None, default_path: str,
                      default_url: str, label: str, downloader) -> str:
    """Resolve an appendix path and download the official source if absent."""
    if provided and provided.startswith("http"):
        click.echo(f"Downloading {label} from: {provided}")
        return downloader(provided, output_path=default_path)

    path = provided or default_path
    if os.path.exists(path):
        return path

    if provided:
        raise click.ClickException(f"{label} not found at {provided}")

    click.echo(f"{label} not found at {path}, downloading from {default_url}...")
    return downloader(default_url, output_path=path)


if __name__ == "__main__":
    cli()
