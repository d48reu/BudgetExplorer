"""Two-level budget verification with diff report.

Compares database totals against published figures at two levels:
  Level 1: Grand total (sum of all department budgets)
  Level 2: Per strategic area subtotals

Generates a human-readable diff report showing expected vs actual at
every checked level, with PASS/FAIL status and difference amounts.
"""

import json
import logging
from dataclasses import dataclass

from pipeline.config import TOLERANCE_CENTS

logger = logging.getLogger(__name__)


@dataclass
class VerificationResult:
    """Result of a single verification check."""

    level: str  # 'grand_total' or strategic area name
    expected_cents: int
    actual_cents: int
    diff_cents: int
    within_tolerance: bool


def verify_budget_totals(
    conn, fiscal_year_id: int, published_totals_path: str
) -> list[VerificationResult]:
    """Compare database totals against published figures.

    Performs two-level verification:
      Level 1: Grand totals -- operating, capital, and total budget
               Gross operating minus interagency = net operating
      Level 2: Each strategic area -- operating subtotals using
               department_budgets.strategic_area_id

    Args:
        conn: psycopg2 connection (open, with cursor support).
        fiscal_year_id: ID of the fiscal year to verify.
        published_totals_path: Path to published_totals.json.

    Returns:
        List of VerificationResult objects, one per check level.
    """
    with open(published_totals_path) as f:
        published = json.load(f)

    results = []
    cur = conn.cursor()

    # Level 1a: Gross operating (sum of all department operating budgets)
    cur.execute(
        """
        SELECT COALESCE(SUM(operating_budget), 0)
        FROM department_budgets
        WHERE fiscal_year_id = %s AND stage = 'adopted'
        """,
        (fiscal_year_id,),
    )
    actual_gross_operating = cur.fetchone()[0]

    if "gross_operating_cents" in published:
        expected_gross = published["gross_operating_cents"]
        diff = abs(actual_gross_operating - expected_gross)
        results.append(
            VerificationResult(
                level="Gross Operating",
                expected_cents=expected_gross,
                actual_cents=actual_gross_operating,
                diff_cents=diff,
                within_tolerance=diff <= TOLERANCE_CENTS,
            )
        )

    # Level 1b: Net operating (gross minus interagency transfers)
    interagency = published.get("interagency_transfers_cents", 0)
    expected_net = published["operating_cents"]
    actual_net = actual_gross_operating - interagency
    diff = abs(actual_net - expected_net)
    results.append(
        VerificationResult(
            level="Net Operating",
            expected_cents=expected_net,
            actual_cents=actual_net,
            diff_cents=diff,
            within_tolerance=diff <= TOLERANCE_CENTS,
        )
    )

    # Level 1c: Total capital
    cur.execute(
        """
        SELECT COALESCE(SUM(capital_budget), 0)
        FROM department_budgets
        WHERE fiscal_year_id = %s AND stage = 'adopted'
        """,
        (fiscal_year_id,),
    )
    actual_capital = cur.fetchone()[0]
    expected_capital = published["capital_cents"]
    diff = abs(actual_capital - expected_capital)
    results.append(
        VerificationResult(
            level="Total Capital",
            expected_cents=expected_capital,
            actual_cents=actual_capital,
            diff_cents=diff,
            within_tolerance=diff <= TOLERANCE_CENTS,
        )
    )

    # Level 1d: Grand total (net operating + capital)
    # DB stores gross operating per dept; published total is net (after
    # subtracting interagency transfers)
    actual_net_total = (actual_gross_operating - interagency) + actual_capital
    expected_total = published["total_budget_cents"]
    diff = abs(actual_net_total - expected_total)
    results.append(
        VerificationResult(
            level="Grand Total (Net)",
            expected_cents=expected_total,
            actual_cents=actual_net_total,
            diff_cents=diff,
            within_tolerance=diff <= TOLERANCE_CENTS,
        )
    )

    # Level 2: Per strategic area operating subtotals
    # Uses db.strategic_area_id (from appendix data) with fallback to
    # d.strategic_area_id for BIB-only data
    for area in published.get("strategic_areas", []):
        if "operating_cents" in area:
            # Appendix-aware: verify operating per area
            cur.execute(
                """
                SELECT COALESCE(SUM(db.operating_budget), 0)
                FROM department_budgets db
                JOIN strategic_areas sa
                    ON sa.id = COALESCE(db.strategic_area_id, (
                        SELECT d.strategic_area_id
                        FROM departments d WHERE d.id = db.department_id
                    ))
                WHERE db.fiscal_year_id = %s
                  AND sa.slug = %s
                  AND db.stage = 'adopted'
                """,
                (fiscal_year_id, area["slug"]),
            )
            actual = cur.fetchone()[0]
            expected = area["operating_cents"]
            diff = abs(actual - expected)

            results.append(
                VerificationResult(
                    level=f"{area['name']} (Operating)",
                    expected_cents=expected,
                    actual_cents=actual,
                    diff_cents=diff,
                    within_tolerance=diff <= TOLERANCE_CENTS,
                )
            )
        else:
            # BIB-only: verify total per area
            cur.execute(
                """
                SELECT COALESCE(SUM(db.total_budget), 0)
                FROM department_budgets db
                JOIN strategic_areas sa
                    ON sa.id = COALESCE(db.strategic_area_id, (
                        SELECT d.strategic_area_id
                        FROM departments d WHERE d.id = db.department_id
                    ))
                WHERE db.fiscal_year_id = %s
                  AND sa.slug = %s
                  AND db.stage = 'adopted'
                """,
                (fiscal_year_id, area["slug"]),
            )
            actual = cur.fetchone()[0]
            expected = area["total_budget_cents"]
            diff = abs(actual - expected)

            results.append(
                VerificationResult(
                    level=area["name"],
                    expected_cents=expected,
                    actual_cents=actual,
                    diff_cents=diff,
                    within_tolerance=diff <= TOLERANCE_CENTS,
                )
            )

    cur.close()
    return results


def generate_diff_report(results: list[VerificationResult]) -> str:
    """Format a human-readable verification report.

    Shows PASS/FAIL status for each level, expected vs actual amounts
    (in dollars, formatted with commas), difference amount and percentage,
    and an overall PASS/FAIL summary.

    Args:
        results: List of VerificationResult objects from verify_budget_totals.

    Returns:
        Multi-line string with the formatted report.
    """
    lines = []
    lines.append("=" * 72)
    lines.append("BUDGET VERIFICATION REPORT")
    lines.append("=" * 72)
    lines.append("")

    all_passed = all(r.within_tolerance for r in results)

    for r in results:
        status = "PASS" if r.within_tolerance else "FAIL"
        expected_dollars = r.expected_cents / 100
        actual_dollars = r.actual_cents / 100
        diff_dollars = r.diff_cents / 100

        # Calculate percentage difference (avoid division by zero)
        if r.expected_cents > 0:
            pct = (r.diff_cents / r.expected_cents) * 100
        else:
            pct = 0.0 if r.diff_cents == 0 else 100.0

        lines.append(f"[{status}] {r.level}")
        lines.append(f"  Expected:   ${expected_dollars:>20,.2f}")
        lines.append(f"  Actual:     ${actual_dollars:>20,.2f}")
        lines.append(f"  Difference: ${diff_dollars:>20,.2f} ({pct:.4f}%)")
        lines.append(
            f"  Tolerance:  ${TOLERANCE_CENTS / 100:>20,.2f}"
        )
        lines.append("")

    lines.append("-" * 72)

    pass_count = sum(1 for r in results if r.within_tolerance)
    fail_count = sum(1 for r in results if not r.within_tolerance)

    if all_passed:
        lines.append(
            f"OVERALL: PASSED ({pass_count}/{len(results)} checks within tolerance)"
        )
    else:
        lines.append(
            f"OVERALL: FAILED ({fail_count}/{len(results)} checks exceeded tolerance)"
        )

    lines.append("=" * 72)

    return "\n".join(lines)


def run_verification(
    database_url: str,
    fiscal_year: str,
    published_totals_path: str,
) -> tuple[bool, str]:
    """Orchestrate the full verification process.

    Connects to the database, looks up the fiscal year, runs
    verify_budget_totals, and generates the diff report.

    Args:
        database_url: PostgreSQL connection string.
        fiscal_year: Fiscal year label (e.g., 'FY 2025-26').
        published_totals_path: Path to published_totals.json.

    Returns:
        Tuple of (all_passed: bool, report: str).
        The caller (CLI) is responsible for halting on failure.
    """
    from pipeline.load.db import get_db_connection

    with get_db_connection(database_url) as conn:
        cur = conn.cursor()

        # Look up fiscal year ID
        cur.execute(
            "SELECT id FROM fiscal_years WHERE label = %s",
            (fiscal_year,),
        )
        row = cur.fetchone()
        cur.close()

        if row is None:
            report = (
                f"ERROR: Fiscal year '{fiscal_year}' not found in database.\n"
                f"Run the pipeline first: python -m pipeline.cli run-all"
            )
            return False, report

        fiscal_year_id = row[0]

        results = verify_budget_totals(
            conn, fiscal_year_id, published_totals_path
        )

    report = generate_diff_report(results)
    all_passed = all(r.within_tolerance for r in results)

    return all_passed, report
