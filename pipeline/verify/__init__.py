"""Verification modules for budget data integrity.

Provides two-level verification (grand total + strategic area subtotals)
against published figures, with human-readable diff reporting.
"""

from pipeline.verify.checker import (
    run_verification,
    verify_budget_totals,
    generate_diff_report,
    VerificationResult,
)

__all__ = [
    "run_verification",
    "verify_budget_totals",
    "generate_diff_report",
    "VerificationResult",
]
