# Phase 1: Data Pipeline - Research

**Researched:** 2026-02-28
**Domain:** PDF data extraction, PostgreSQL seeding, budget data verification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- The Budget in Brief PDF is the single source document for Phase 1
- Pipeline must support both a local file path and downloading from a public URL
- Other document types (detailed budget book, millage schedules, etc.) are deferred to later phases
- Extract whatever the PDF provides -- mirror the PDF's own structure and level of detail
- Both revenue data (where money comes from) and expenditure data (where it goes) must be extracted
- Operating budget and capital budget must be stored as separate values per department
- The Budget in Brief contains a published penny/dollar breakdown graphic -- extract and match it exactly rather than calculating from totals
- The current FY 2025-26 Budget in Brief PDF includes multiple prior-year comparison columns
- Pipeline focuses on extracting data from the current year's PDF (not a multi-PDF design)
- For any fiscal years not covered by the current PDF, user will provide historical data as CSV/JSON files for manual seeding
- Goal is 5 fiscal years: FY 2021-22 through FY 2025-26
- Departments and strategic areas change significantly across years (renamed, merged, reorganized) -- schema and seeding must account for this
- Small rounding tolerance allowed (e.g., +/-$1,000) to account for PDF rounding -- not exact to the penny
- Verification checks at two levels: grand total and each strategic area subtotal -- department-level numbers are trusted if strategic area totals reconcile
- On verification failure: generate a detailed diff report showing expected vs actual at every checked level, then halt with error
- Verification runs automatically as the final pipeline step after seeding AND is available as a standalone script for re-verification at any time

### Claude's Discretion
- PDF parsing approach and library choice
- Database schema design and migration tooling
- How to handle cross-year department/area mismatches (renamed, merged, added departments)
- Exact diff report format and rounding tolerance threshold
- CSV/JSON schema for manual historical data seeding

### Deferred Ideas (OUT OF SCOPE)
- Additional source documents (detailed budget book, millage rate schedules, revenue detail docs) -- future phases
- Multi-PDF pipeline that can process any year's Budget in Brief -- not needed for Phase 1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Budget data extracted from PDF and verified against published totals ($13,233,238,000) | pdfplumber for extraction, per-section table_settings tuning, two-level verification (grand total + strategic area subtotals) with tolerance |
| DATA-02 | All monetary values stored as BigInt cents in PostgreSQL | Schema uses BIGINT columns, Python int conversion (value * 100), no floats in pipeline |
| DATA-03 | Seed data covers all 9 strategic areas, 35 departments, and FY 2025-26 figures | Schema already defines strategic areas and departments; extraction must populate department_budgets and strategic_area_budgets tables |
| DATA-04 | Historical data seeded for 5 fiscal years (FY 2021-22 through FY 2025-26) | Prior-year columns from current PDF + CSV/JSON manual seeding for gaps; department_aliases table for cross-year mapping |
| DATA-05 | Millage rate data seeded for tax calculator calculations | Extract millage table from Budget in Brief; seed millage_rates table per fiscal year |
</phase_requirements>

## Summary

This phase builds a Python data pipeline that extracts budget data from the Miami-Dade County FY 2025-26 Budget in Brief PDF (a machine-generated, Adobe InDesign-produced document), transforms it into structured records, and loads it into PostgreSQL with all monetary values as BigInt cents. The pipeline must handle multiple data sections within the PDF (strategic area summaries, department budgets, revenue sources, expenditure categories, millage rates, and the penny/dollar breakdown) each of which may require different pdfplumber table_settings configurations.

The key technical challenges are: (1) the Budget in Brief PDF likely uses a mix of bordered tables and text-aligned columns requiring per-section extraction tuning, (2) cross-year department changes (notably the 2025 constitutional offices reorganization where Miami-Dade Police, Elections, and Tax Collector became independent offices) require an alias/mapping system, and (3) verification must reconcile extracted totals against published figures at both grand-total and strategic-area levels with a defined rounding tolerance.

The existing SQL schema in `budget-explorer-schema.sql` provides a solid foundation. The pipeline needs to apply this schema via migration scripts, extract and transform PDF data, seed it, and run verification. Historical data for years not covered by the current PDF will be seeded from user-provided CSV/JSON files using a defined schema.

**Primary recommendation:** Use pdfplumber 0.11.x with per-section crop + table_settings configurations, raw SQL migration scripts (no ORM needed for a seed-only pipeline), psycopg2-binary for database access, and a click-based CLI that chains extract -> transform -> load -> verify steps.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfplumber | 0.11.9 | PDF text and table extraction | Best-in-class for machine-generated PDFs with complex tables; visual debugging for tuning; built on pdfminer.six |
| psycopg2-binary | 2.9.11 | PostgreSQL adapter | The standard Python PostgreSQL driver; binary variant avoids C compilation issues; mature and battle-tested |
| python-dotenv | 1.2.1 | Environment variable management | Load DATABASE_URL and other config from .env files |
| click | 8.1.x | CLI framework | Clean command-line interface for pipeline steps; better than argparse for multi-command tools |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| requests | 2.32.x | HTTP client | Download Budget in Brief PDF from public URL when not using local file path |
| Pillow | 10.x | Image processing | Required by pdfplumber's to_image() for visual debugging during extraction tuning |
| pytest | 8.x | Test framework | Verification scripts and unit tests for extraction logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfplumber | Camelot | Camelot is better for pure lattice tables but requires Ghostscript dependency; pdfplumber handles mixed text+table extraction better and has visual debugging |
| pdfplumber | Tabula-py | Tabula requires JVM; pdfplumber is pure Python; pdfplumber handles complex layouts better |
| psycopg2-binary | SQLAlchemy | SQLAlchemy adds ORM overhead unnecessary for a seed-only pipeline; raw SQL via psycopg2 is simpler and more transparent for this use case |
| psycopg2-binary | asyncpg | Async not needed for a batch pipeline; psycopg2 is simpler |
| Raw SQL migrations | Alembic | Alembic adds complexity (requires SQLAlchemy models) not justified for a one-time schema setup; raw .sql files with version numbering are sufficient |

**Installation:**
```bash
pip install pdfplumber==0.11.9 psycopg2-binary==2.9.11 python-dotenv==1.2.1 click requests Pillow pytest
```

**requirements.txt:**
```
pdfplumber==0.11.9
psycopg2-binary==2.9.11
python-dotenv==1.2.1
click>=8.1.0
requests>=2.31.0
Pillow>=10.0.0
pytest>=8.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
pipeline/
├── __init__.py
├── cli.py                    # Click CLI entry point (extract, load, verify, run-all)
├── config.py                 # DATABASE_URL, PDF_PATH, tolerances, etc.
├── extract/
│   ├── __init__.py
│   ├── pdf_reader.py         # pdfplumber wrapper: open PDF, crop sections
│   ├── strategic_areas.py    # Extract strategic area budget table(s)
│   ├── departments.py        # Extract department budget tables
│   ├── revenue.py            # Extract revenue source breakdown
│   ├── expenditures.py       # Extract expenditure category data
│   ├── millage.py            # Extract millage rate table
│   └── penny.py              # Extract penny/dollar breakdown graphic data
├── transform/
│   ├── __init__.py
│   ├── clean.py              # Strip $, commas, parentheses; convert to BigInt cents
│   ├── validate.py           # Pre-load data integrity checks
│   └── historical.py         # Parse CSV/JSON historical data files
├── load/
│   ├── __init__.py
│   ├── db.py                 # Database connection helper (psycopg2 + context manager)
│   ├── seed.py               # Insert/upsert extracted data into PostgreSQL
│   └── seed_historical.py    # Load historical CSV/JSON data
├── verify/
│   ├── __init__.py
│   └── checker.py            # Compare DB totals vs published figures; generate diff report
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_department_aliases.sql
├── data/
│   ├── historical/           # User-provided CSV/JSON for prior fiscal years
│   └── published_totals.json # Known-good figures for verification
└── tests/
    ├── test_extract.py
    ├── test_transform.py
    ├── test_verify.py
    └── conftest.py
```

### Pattern 1: Per-Section PDF Extraction with Crop + Table Settings
**What:** Each section of the Budget in Brief PDF (strategic areas, departments, revenue, millage, etc.) gets its own extractor module with tuned crop coordinates and table_settings.
**When to use:** Always -- the Budget in Brief has different table formats per section.
**Example:**
```python
# Source: pdfplumber GitHub README + PyPI docs
import pdfplumber

def extract_strategic_area_table(pdf_path: str) -> list[dict]:
    """Extract strategic area budget data from the Budget in Brief PDF."""
    with pdfplumber.open(pdf_path) as pdf:
        # Page numbers will need to be determined by inspecting the PDF
        page = pdf.pages[STRATEGIC_AREA_PAGE]

        # Crop to the specific table region
        # bbox = (x0, top, x1, bottom) in points (1/72 inch)
        cropped = page.crop(STRATEGIC_AREA_BBOX)

        # Table settings tuned for this specific section
        table_settings = {
            "vertical_strategy": "lines",
            "horizontal_strategy": "lines",
            "snap_tolerance": 3,
            "intersection_tolerance": 3,
        }

        tables = cropped.extract_tables(table_settings)

        # Debug: visualize extraction during development
        # im = cropped.to_image()
        # im.debug_tablefinder(table_settings)
        # im.save("debug_strategic_areas.png")

        return _parse_strategic_area_rows(tables[0])
```

### Pattern 2: BigInt Cents Conversion
**What:** All monetary values are converted from dollar strings to integer cents before storage.
**When to use:** Every monetary value in the pipeline.
**Example:**
```python
import re

def dollars_to_cents(value: str) -> int:
    """Convert a dollar string like '$1,234,567' or '($1,234)' to integer cents.

    Handles: $1,234,567 | 1,234,567 | ($1,234) | -$1,234 | 1234.56
    Returns integer cents (value * 100).
    """
    if value is None or str(value).strip() in ('', '-', 'N/A'):
        return 0

    s = str(value).strip()

    # Detect negative: parentheses or leading minus
    negative = s.startswith('(') or s.startswith('-')

    # Remove all non-numeric characters except decimal point
    cleaned = re.sub(r'[^0-9.]', '', s)

    if not cleaned:
        return 0

    # Convert to cents
    if '.' in cleaned:
        dollars = float(cleaned)
        cents = round(dollars * 100)
    else:
        # Whole dollar amount (no decimal) -- common in budget summaries
        cents = int(cleaned) * 100

    return -cents if negative else cents
```

### Pattern 3: Idempotent Seed with Delete-Write
**What:** Each seed operation deletes existing data for the target fiscal year before inserting, making the pipeline safe to re-run.
**When to use:** Every load/seed operation.
**Example:**
```python
import psycopg2
from contextlib import contextmanager

@contextmanager
def get_db_connection(database_url: str):
    """Context manager for database connections with auto-commit on success."""
    conn = psycopg2.connect(database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def seed_department_budgets(conn, fiscal_year_id: int, budgets: list[dict]):
    """Idempotent seed: delete existing data for this FY, then insert."""
    cur = conn.cursor()

    # Delete existing data for this fiscal year (idempotent)
    cur.execute(
        "DELETE FROM department_budgets WHERE fiscal_year_id = %s",
        (fiscal_year_id,)
    )

    # Insert new data
    for b in budgets:
        cur.execute("""
            INSERT INTO department_budgets
                (fiscal_year_id, department_id, operating_budget, capital_budget,
                 total_budget, employee_count, is_actual)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            fiscal_year_id, b['department_id'],
            b['operating_cents'], b['capital_cents'],
            b['operating_cents'] + b['capital_cents'],
            b.get('employees'), b.get('is_actual', False)
        ))

    cur.close()
```

### Pattern 4: Two-Level Verification with Diff Report
**What:** Verify extracted data against published totals at grand-total and strategic-area levels.
**When to use:** As the final pipeline step and as a standalone script.
**Example:**
```python
import json
from dataclasses import dataclass

@dataclass
class VerificationResult:
    level: str          # 'grand_total' or strategic area name
    expected_cents: int
    actual_cents: int
    diff_cents: int
    within_tolerance: bool

TOLERANCE_CENTS = 100_000  # $1,000 = 100,000 cents

def verify_budget_totals(conn, fiscal_year_id: int,
                         published_totals_path: str) -> list[VerificationResult]:
    """Compare database totals against published figures."""
    with open(published_totals_path) as f:
        published = json.load(f)

    results = []
    cur = conn.cursor()

    # Check grand total
    cur.execute("""
        SELECT COALESCE(SUM(total_budget), 0)
        FROM department_budgets
        WHERE fiscal_year_id = %s AND is_actual = FALSE
    """, (fiscal_year_id,))
    actual_total = cur.fetchone()[0]
    expected_total = published['total_budget_cents']
    diff = abs(actual_total - expected_total)

    results.append(VerificationResult(
        level='grand_total',
        expected_cents=expected_total,
        actual_cents=actual_total,
        diff_cents=diff,
        within_tolerance=diff <= TOLERANCE_CENTS
    ))

    # Check each strategic area subtotal
    for area in published.get('strategic_areas', []):
        cur.execute("""
            SELECT COALESCE(SUM(db.total_budget), 0)
            FROM department_budgets db
            JOIN departments d ON d.id = db.department_id
            JOIN strategic_areas sa ON sa.id = d.strategic_area_id
            WHERE db.fiscal_year_id = %s AND sa.slug = %s AND db.is_actual = FALSE
        """, (fiscal_year_id, area['slug']))
        actual = cur.fetchone()[0]
        expected = area['total_budget_cents']
        diff = abs(actual - expected)

        results.append(VerificationResult(
            level=area['name'],
            expected_cents=expected,
            actual_cents=actual,
            diff_cents=diff,
            within_tolerance=diff <= TOLERANCE_CENTS
        ))

    cur.close()
    return results
```

### Anti-Patterns to Avoid
- **Hardcoding page numbers without constants:** PDF page numbers should be defined in a config file or constants module. If the PDF changes layout, one config update fixes everything.
- **Using floats anywhere in the money pipeline:** Never use Python `float` for dollar amounts. Parse strings directly to int cents. Even intermediate calculations should stay in cents.
- **Treating the pipeline as one monolithic script:** Break into extract -> transform -> load -> verify steps. Each step should be runnable independently for debugging.
- **Skipping visual debugging during extraction tuning:** Always use `page.to_image().debug_tablefinder()` when setting up extraction for a new PDF section. Save debug images to verify table detection before writing parsing logic.
- **Assuming consistent PDF structure across all pages:** The Budget in Brief mixes narrative text, graphics, and data tables. Each section needs its own extraction approach.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table detection | Custom coordinate-based text parsing | pdfplumber's `extract_tables()` with `table_settings` | Table detection handles edge cases (merged cells, spanning rows, missing borders) that are extremely hard to get right manually |
| Dollar string parsing | Ad-hoc regex per occurrence | A single `dollars_to_cents()` utility function | Dollar formats vary ($1,234 vs 1,234,567 vs ($1,234) vs 1234.56); centralizing handles all variants |
| Database connection management | Manual open/close/commit/rollback | Context manager pattern with psycopg2 | Prevents connection leaks and ensures proper transaction handling on errors |
| Schema versioning | Manual SQL execution order | Numbered migration files (001_, 002_) with a runner | Ensures reproducible database setup from scratch |
| CLI argument parsing | sys.argv parsing | click library | Handles subcommands, options, help text, and validation cleanly |

**Key insight:** The Budget in Brief PDF is a formatted publication document, not a data export. Its tables have visual formatting (merged headers, color-coded rows, footnotes within table areas) that make raw text parsing unreliable. pdfplumber's table detection algorithm handles these edge cases far better than custom coordinate parsing.

## Common Pitfalls

### Pitfall 1: Table Settings That Work on One Section Fail on Another
**What goes wrong:** Using the same `table_settings` for all PDF sections produces garbled output because different sections use different table formatting (some have borders, some use text alignment only).
**Why it happens:** The Budget in Brief PDF is a designed publication -- each section has its own visual style.
**How to avoid:** Create a separate extractor module per section with its own tuned `table_settings`. Use `debug_tablefinder()` to verify each section's extraction independently.
**Warning signs:** Extraction returns wrong number of columns, merged cells appear as empty strings, or numeric columns contain text from adjacent sections.

### Pitfall 2: Dollar Amount Parsing Edge Cases
**What goes wrong:** Budget values parse incorrectly due to unexpected formatting: parentheses for negatives, em-dashes for zero, thousand separators, or "N/A" strings.
**Why it happens:** PDF text extraction preserves the visual formatting of the source document, which uses typographic conventions rather than machine-readable number formats.
**How to avoid:** Build a robust `dollars_to_cents()` function that handles all observed variants. Add unit tests with actual values from the PDF. Test with edge cases: `($1,234)`, `$0`, `-`, `N/A`, `1,234,567,890`.
**Warning signs:** Verification totals are wildly off; negative values appear as large positives; zero values cause errors.

### Pitfall 3: Constitutional Offices Reorganization (2025)
**What goes wrong:** Department names and organizational structure changed significantly in January 2025. Prior-year data may reference "Miami-Dade Police Department" but FY 2025-26 shows "Sheriff" as a constitutional office.
**Why it happens:** Miami-Dade County established 5 independent constitutional offices (Sheriff, Supervisor of Elections, Tax Collector, Property Appraiser, Clerk of Court) that were previously county departments.
**How to avoid:** Create a `department_aliases` table that maps old department names to current ones. When seeding historical data, resolve aliases before inserting. Allow a department to exist in the schema even if it only appears in historical years.
**Warning signs:** Historical year data has fewer departments than expected, or department-level YoY comparisons show departments with data in some years but not others.

### Pitfall 4: PDF Text Extraction Includes Header/Footer Noise
**What goes wrong:** Extracted text includes page headers, footers, page numbers, or section titles mixed into table data.
**Why it happens:** pdfplumber extracts all text objects on a page. Headers/footers overlap with table boundaries.
**How to avoid:** Always use `page.crop(bbox)` to isolate the table region before extracting. Determine crop coordinates using `to_image()` visual debugging. Add post-extraction filtering to remove known non-data rows.
**Warning signs:** First or last rows of extracted tables contain text like "Budget in Brief" or page numbers.

### Pitfall 5: Rounding Differences Between Totals and Detail Rows
**What goes wrong:** The sum of individual department budgets within a strategic area does not exactly equal the published strategic area total, because the PDF rounds numbers differently at different levels.
**Why it happens:** Budget documents often present rounded figures (e.g., thousands or millions) at summary level but more precise figures at detail level.
**How to avoid:** Use the user-specified tolerance of +/-$1,000 (100,000 cents). Verify at two levels only: grand total and strategic area. Trust department-level numbers if strategic area totals reconcile.
**Warning signs:** Verification fails with differences under $1,000 -- adjust tolerance. If differences exceed $1,000, extraction is likely wrong.

### Pitfall 6: Non-Idempotent Seeds Causing Duplicate Data
**What goes wrong:** Running the pipeline twice doubles all budget data because INSERT statements don't check for existing records.
**Why it happens:** Missing DELETE before INSERT, or no UNIQUE constraints.
**How to avoid:** Use the delete-write pattern: DELETE existing data for the target fiscal year before inserting. The schema already has UNIQUE constraints (e.g., `UNIQUE(fiscal_year_id, department_id, is_actual)`) that serve as a safety net.
**Warning signs:** Budget totals in verification are exactly 2x the expected amount.

## Code Examples

### Opening and Inspecting a PDF
```python
# Source: pdfplumber GitHub README
import pdfplumber

def inspect_pdf(pdf_path: str):
    """Print page count and inspect first few pages for table detection."""
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")

        for i, page in enumerate(pdf.pages[:5]):
            print(f"\n--- Page {i} ---")
            print(f"  Dimensions: {page.width} x {page.height}")
            print(f"  Tables found: {len(page.find_tables())}")

            # Save debug image showing detected tables
            im = page.to_image(resolution=150)
            im.debug_tablefinder()
            im.save(f"debug_page_{i}.png")

            # Print raw text for inspection
            text = page.extract_text(layout=True)
            if text:
                lines = text.split('\n')
                print(f"  Text lines: {len(lines)}")
                for line in lines[:5]:
                    print(f"    {line}")
```

### Running SQL Migration Files
```python
import os
import psycopg2

def run_migrations(database_url: str, migrations_dir: str):
    """Execute numbered SQL migration files in order."""
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    # Create migrations tracking table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            filename VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # Get already-applied migrations
    cur.execute("SELECT filename FROM _migrations")
    applied = {row[0] for row in cur.fetchall()}

    # Find and sort migration files
    migration_files = sorted(
        f for f in os.listdir(migrations_dir)
        if f.endswith('.sql')
    )

    for filename in migration_files:
        if filename in applied:
            print(f"  SKIP {filename} (already applied)")
            continue

        filepath = os.path.join(migrations_dir, filename)
        with open(filepath) as f:
            sql = f.read()

        print(f"  APPLY {filename}")
        cur.execute(sql)
        cur.execute(
            "INSERT INTO _migrations (filename) VALUES (%s)",
            (filename,)
        )

    conn.commit()
    cur.close()
    conn.close()
```

### CLI Entry Point with Click
```python
# Source: click documentation patterns
import click
from dotenv import load_dotenv

load_dotenv()

@click.group()
def cli():
    """Miami-Dade Budget Explorer - Data Pipeline"""
    pass

@cli.command()
@click.option('--pdf', required=True, help='Path to Budget in Brief PDF or URL')
@click.option('--output', default='extracted_data.json', help='Output JSON file')
def extract(pdf, output):
    """Extract budget data from the Budget in Brief PDF."""
    click.echo(f"Extracting from: {pdf}")
    # ... extraction logic

@cli.command()
@click.option('--data', required=True, help='Path to extracted data JSON')
def load(data):
    """Load extracted data into PostgreSQL."""
    click.echo(f"Loading data from: {data}")
    # ... loading logic

@cli.command()
@click.option('--fiscal-year', required=True, help='Fiscal year label (e.g., FY 2025-26)')
def verify(fiscal_year):
    """Verify database totals against published figures."""
    click.echo(f"Verifying: {fiscal_year}")
    # ... verification logic

@cli.command()
@click.option('--pdf', required=True, help='Path to Budget in Brief PDF or URL')
def run_all(pdf):
    """Run the complete pipeline: extract -> load -> verify."""
    click.echo("Running complete pipeline...")
    # ... chain all steps

if __name__ == '__main__':
    cli()
```

### Historical Data CSV Schema
```python
# Recommended CSV format for manual historical data seeding
# File: data/historical/fy_2021_22_departments.csv

HISTORICAL_CSV_COLUMNS = [
    'fiscal_year',          # 'FY 2021-22'
    'strategic_area',       # 'Public Safety'
    'department_name',      # 'Miami-Dade Police Department'  (may be old name)
    'department_alias',     # 'Sheriff'  (current name, if renamed)
    'operating_budget',     # 1234567890  (in whole dollars)
    'capital_budget',       # 456789  (in whole dollars)
    'employee_count',       # 3500
    'is_actual',            # true/false
]

# The pipeline's historical loader:
# 1. Reads CSV
# 2. Resolves department_alias to current department_id via department_aliases table
# 3. Converts dollar amounts to cents
# 4. Inserts into department_budgets
```

### Department Aliases Schema
```sql
-- Migration 002: Department aliases for cross-year mapping
CREATE TABLE IF NOT EXISTS department_aliases (
    id SERIAL PRIMARY KEY,
    current_department_id INTEGER NOT NULL REFERENCES departments(id),
    historical_name VARCHAR(200) NOT NULL,
    fiscal_year_start VARCHAR(20),     -- first FY this alias was used
    fiscal_year_end VARCHAR(20),       -- last FY this alias was used (NULL = still current)
    notes TEXT,                        -- e.g., 'Reorganized into Sheriff constitutional office'
    UNIQUE(historical_name, fiscal_year_start)
);

-- Seed known aliases for the 2025 constitutional offices reorganization
INSERT INTO department_aliases (current_department_id, historical_name, fiscal_year_start, fiscal_year_end, notes) VALUES
((SELECT id FROM departments WHERE slug = 'sheriff'), 'Miami-Dade Police Department', 'FY 2021-22', 'FY 2024-25', 'Became independent Sheriff office Jan 2025'),
((SELECT id FROM departments WHERE slug = 'supervisor-of-elections'), 'Elections Department', 'FY 2021-22', 'FY 2024-25', 'Became independent constitutional office Jan 2025'),
((SELECT id FROM departments WHERE slug = 'tax-collector'), 'Tax Collector Division', 'FY 2021-22', 'FY 2024-25', 'Became independent constitutional office Jan 2025');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tabula-py (Java-dependent) | pdfplumber (pure Python) | ~2020 onward | No JVM dependency; better visual debugging; handles complex layouts |
| psycopg2 only | psycopg2-binary for dev, psycopg2 for production | Ongoing | Binary wheel avoids compilation; same API |
| SQLAlchemy + Alembic for all DB work | Raw SQL for simple pipelines, ORM for apps | Ongoing | Simpler projects benefit from raw SQL transparency; ORM adds unnecessary abstraction for ETL |
| Manual SQL migrations | Numbered .sql files with tracking table | Standard pattern | Lightweight, no framework dependency, fully transparent |

**Deprecated/outdated:**
- **PyPDF2/PyPDF4:** Text extraction only, no table detection. Merged into pypdf. Not suitable for structured data extraction.
- **PostgreSQL MONEY type:** Do not use. Locale-dependent, limited precision, hard to work with programmatically. Use BIGINT cents instead.
- **psycopg3 (psycopg):** The newer async-first driver. Not needed here -- psycopg2-binary is simpler and sufficient for a batch pipeline.

## Open Questions

1. **Exact PDF page numbers and table coordinates for each section**
   - What we know: The Budget in Brief PDF is published by Miami-Dade, created with Adobe InDesign, and contains strategic area tables, department budgets, revenue breakdowns, millage rates, and the penny/dollar breakdown.
   - What's unclear: Exact page numbers and bounding boxes for each data section. The PDF could not be fetched and parsed during research.
   - Recommendation: The first implementation task must include a PDF inspection step using `pdfplumber.open()` + `to_image().debug_tablefinder()` to map all data sections before writing extraction logic. Save debug images for reference.

2. **Which prior fiscal years are included as comparison columns in the current PDF**
   - What we know: The Budget in Brief typically includes 2-3 years of comparison data.
   - What's unclear: Whether it includes all 5 target years (FY 2021-22 through FY 2025-26) or just recent years.
   - Recommendation: Extract whatever years the PDF provides. For any missing years, create the CSV/JSON template and document which years need manual data entry.

3. **Exact millage rate values and taxing authority names**
   - What we know: The schema has a `millage_rates` table. PROJECT.md states total county millage is 9.5778 mills. The PDF contains a property tax section with millage breakdowns.
   - What's unclear: The exact list of taxing authorities and their individual rates.
   - Recommendation: Extract from the PDF millage table. Cross-reference with published county tax documents if extraction is ambiguous.

4. **Penny/dollar breakdown data format**
   - What we know: The Budget in Brief contains a graphic showing how each dollar is allocated by strategic area (e.g., "19 cents of every dollar goes to Public Safety"). User decision says to extract and match it exactly.
   - What's unclear: Whether this data is in a table or embedded in a graphic/infographic.
   - Recommendation: If it's a table, extract with pdfplumber. If it's a graphic, the cents values may need to be manually verified against the extracted strategic area percentages. The `cents_per_dollar` column in `strategic_area_budgets` stores this.

## Sources

### Primary (HIGH confidence)
- [pdfplumber PyPI](https://pypi.org/project/pdfplumber/) - Version 0.11.9, released Jan 5 2026, Python 3.8+
- [pdfplumber GitHub](https://github.com/jsvine/pdfplumber) - API documentation, table extraction settings, visual debugging
- [psycopg2-binary PyPI](https://pypi.org/project/psycopg2-binary/) - Version 2.9.11, Python 3.9+
- [SQLAlchemy PyPI](https://pypi.org/project/SQLAlchemy/) - Version 2.0.47 (noted but NOT used in this pipeline)
- [Alembic PyPI](https://pypi.org/project/alembic/) - Version 1.18.4 (noted but NOT used; raw SQL preferred)
- [PostgreSQL Numeric Types docs](https://www.postgresql.org/docs/current/datatype-numeric.html) - BIGINT for monetary values
- [Crunchy Data: Working with Money in Postgres](https://www.crunchydata.com/blog/working-with-money-in-postgres) - BIGINT cents pattern

### Secondary (MEDIUM confidence)
- [Miami-Dade FY 2025-26 Adopted Budget page](https://www.miamidade.gov/global/management/budget/2025-26-adopted-budget.page) - PDF URL confirmed: `https://www.miamidade.gov/resources/budget/adopted/fy2025-26/budget-in-brief.pdf`
- [Miami-Dade Constitutional Offices](https://www.miamidade.gov/global/management/constitutional-offices.page) - 2025 reorganization confirmed (Sheriff, Elections, Tax Collector, Property Appraiser, Clerk)
- [BrightCoding pdfplumber guide](https://www.blog.brightcoding.dev/2025/09/29/pdfplumber-the-ultimate-python-library-for-precision-pdf-table-and-text-extraction-with-visual-debugging/) - Table settings, debug_tablefinder patterns
- [Start Data Engineering: Idempotent Pipelines](https://www.startdataengineering.com/post/why-how-idempotent-data-pipeline/) - Delete-write pattern

### Tertiary (LOW confidence)
- Exact PDF section page numbers and bounding boxes -- requires actual PDF inspection during implementation
- Historical fiscal year comparison columns included in the current PDF -- requires PDF inspection
- Penny/dollar breakdown data format (table vs. graphic) -- requires PDF inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All library versions verified on PyPI; pdfplumber is the established choice for machine-generated PDF extraction
- Architecture: HIGH - Pipeline pattern (extract/transform/load/verify) is well-established; schema already exists
- Pitfalls: HIGH - Constitutional offices reorganization confirmed via official county sources; rounding tolerance and idempotency patterns are standard ETL knowledge
- PDF section specifics: LOW - Cannot determine exact page numbers or table coordinates without inspecting the actual PDF

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable libraries, stable PDF document)
