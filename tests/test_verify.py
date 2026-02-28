"""Tests for the budget verification module.

Tests cover:
- VerificationResult dataclass construction
- generate_diff_report with passing and failing results
- Tolerance boundary conditions (99,999 passes, 100,001 fails)
- Report format includes expected/actual/diff for each level
"""

from pipeline.verify.checker import (
    VerificationResult,
    generate_diff_report,
    TOLERANCE_CENTS,
)


# ============================================================
# VerificationResult dataclass tests
# ============================================================


def test_verification_result_fields():
    """VerificationResult stores all required fields."""
    r = VerificationResult(
        level="Grand Total",
        expected_cents=1000000,
        actual_cents=999900,
        diff_cents=100,
        within_tolerance=True,
    )
    assert r.level == "Grand Total"
    assert r.expected_cents == 1000000
    assert r.actual_cents == 999900
    assert r.diff_cents == 100
    assert r.within_tolerance is True


def test_verification_result_failing():
    """VerificationResult can represent a failing check."""
    r = VerificationResult(
        level="Public Safety",
        expected_cents=500000,
        actual_cents=300000,
        diff_cents=200000,
        within_tolerance=False,
    )
    assert r.within_tolerance is False
    assert r.diff_cents == 200000


# ============================================================
# Tolerance boundary tests
# ============================================================


def test_tolerance_constant():
    """TOLERANCE_CENTS is $1,000 = 100,000 cents."""
    assert TOLERANCE_CENTS == 100_000


def test_tolerance_at_boundary_passes():
    """Diff of exactly TOLERANCE_CENTS (100,000 cents = $1,000) passes."""
    r = VerificationResult(
        level="test",
        expected_cents=1000000,
        actual_cents=1000000 - 100_000,
        diff_cents=100_000,
        within_tolerance=100_000 <= TOLERANCE_CENTS,
    )
    assert r.within_tolerance is True


def test_tolerance_below_boundary_passes():
    """Diff of 99,999 cents ($999.99) passes."""
    diff = 99_999
    r = VerificationResult(
        level="test",
        expected_cents=1000000,
        actual_cents=1000000 - diff,
        diff_cents=diff,
        within_tolerance=diff <= TOLERANCE_CENTS,
    )
    assert r.within_tolerance is True


def test_tolerance_above_boundary_fails():
    """Diff of 100,001 cents ($1,000.01) fails."""
    diff = 100_001
    r = VerificationResult(
        level="test",
        expected_cents=1000000,
        actual_cents=1000000 - diff,
        diff_cents=diff,
        within_tolerance=diff <= TOLERANCE_CENTS,
    )
    assert r.within_tolerance is False


def test_tolerance_zero_diff_passes():
    """Diff of 0 always passes."""
    r = VerificationResult(
        level="test",
        expected_cents=1000000,
        actual_cents=1000000,
        diff_cents=0,
        within_tolerance=0 <= TOLERANCE_CENTS,
    )
    assert r.within_tolerance is True


# ============================================================
# generate_diff_report tests
# ============================================================


def test_report_all_passing():
    """Report shows OVERALL: PASSED when all checks pass."""
    results = [
        VerificationResult(
            level="Grand Total",
            expected_cents=1323323800000,
            actual_cents=1323323800000,
            diff_cents=0,
            within_tolerance=True,
        ),
        VerificationResult(
            level="Public Safety",
            expected_cents=273261800000,
            actual_cents=273261750000,
            diff_cents=50000,
            within_tolerance=True,
        ),
    ]
    report = generate_diff_report(results)
    assert "OVERALL: PASSED" in report
    assert "[PASS] Grand Total" in report
    assert "[PASS] Public Safety" in report
    assert "OVERALL: FAILED" not in report


def test_report_with_failure():
    """Report shows OVERALL: FAILED when any check fails."""
    results = [
        VerificationResult(
            level="Grand Total",
            expected_cents=1323323800000,
            actual_cents=1323323800000,
            diff_cents=0,
            within_tolerance=True,
        ),
        VerificationResult(
            level="Public Safety",
            expected_cents=273261800000,
            actual_cents=270000000000,
            diff_cents=3261800000,
            within_tolerance=False,
        ),
    ]
    report = generate_diff_report(results)
    assert "OVERALL: FAILED" in report
    assert "[PASS] Grand Total" in report
    assert "[FAIL] Public Safety" in report


def test_report_contains_expected_actual_diff():
    """Report includes expected, actual, and difference amounts for each level."""
    results = [
        VerificationResult(
            level="Grand Total",
            expected_cents=1000000000,
            actual_cents=999950000,
            diff_cents=50000,
            within_tolerance=True,
        ),
    ]
    report = generate_diff_report(results)

    # Expected $10,000,000.00
    assert "Expected:" in report
    assert "10,000,000.00" in report

    # Actual $9,999,500.00
    assert "Actual:" in report
    assert "9,999,500.00" in report

    # Difference $500.00
    assert "Difference:" in report
    assert "500.00" in report

    # Tolerance line
    assert "Tolerance:" in report


def test_report_shows_percentage():
    """Report includes percentage difference for each check."""
    results = [
        VerificationResult(
            level="Test Area",
            expected_cents=10000000,
            actual_cents=9900000,
            diff_cents=100000,
            within_tolerance=True,
        ),
    ]
    report = generate_diff_report(results)
    # 100000/10000000 = 1.0000%
    assert "1.0000%" in report


def test_report_header_and_footer():
    """Report has proper header and footer formatting."""
    results = [
        VerificationResult(
            level="Grand Total",
            expected_cents=100,
            actual_cents=100,
            diff_cents=0,
            within_tolerance=True,
        ),
    ]
    report = generate_diff_report(results)
    assert "BUDGET VERIFICATION REPORT" in report
    assert "=" * 72 in report


def test_report_empty_results():
    """Report handles empty results list."""
    results = []
    report = generate_diff_report(results)
    assert "OVERALL: PASSED" in report
    assert "0/0" in report


def test_report_multiple_strategic_areas():
    """Report shows all strategic areas when multiple are checked."""
    results = [
        VerificationResult("Grand Total", 100, 100, 0, True),
        VerificationResult("Public Safety", 50, 50, 0, True),
        VerificationResult("Transportation & Mobility", 30, 30, 0, True),
        VerificationResult("General Government", 20, 20, 0, True),
    ]
    report = generate_diff_report(results)
    assert "Grand Total" in report
    assert "Public Safety" in report
    assert "Transportation & Mobility" in report
    assert "General Government" in report
    assert "4/4" in report
