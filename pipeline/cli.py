"""Click CLI entry point for the Miami-Dade Budget Explorer data pipeline."""

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
    source = pdf or PDF_PATH
    click.echo(f"Extracting budget data from: {source}")
    click.echo(f"Output will be written to: {output}")
    click.echo("(Extraction logic will be wired in Plan 02)")


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
    """Load extracted data into PostgreSQL."""
    click.echo(f"Loading data from: {data}")
    click.echo(f"Target fiscal year: {fiscal_year}")
    click.echo("(Loading logic will be wired in Plan 02)")


@cli.command()
@click.option(
    "--fiscal-year",
    default=CURRENT_FISCAL_YEAR,
    help="Fiscal year label to verify (e.g., 'FY 2025-26').",
)
def verify(fiscal_year):
    """Verify database totals against published figures."""
    click.echo(f"Verifying data for: {fiscal_year}")
    click.echo("(Verification logic will be wired in Plan 03)")


@cli.command(name="run-all")
@click.option(
    "--pdf",
    default=None,
    help="Path to Budget in Brief PDF or URL.",
)
@click.option(
    "--fiscal-year",
    default=CURRENT_FISCAL_YEAR,
    help="Fiscal year label.",
)
def run_all(pdf, fiscal_year):
    """Run the complete pipeline: extract -> load -> verify."""
    source = pdf or PDF_PATH
    click.echo(f"Running complete pipeline for {fiscal_year}")
    click.echo(f"PDF source: {source}")
    click.echo("Step 1: Extract")
    click.echo("Step 2: Load")
    click.echo("Step 3: Verify")
    click.echo("(Full pipeline will be wired in Plan 02)")


if __name__ == "__main__":
    cli()
