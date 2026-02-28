"""Tests for pipeline.transform.clean and pipeline.transform.validate modules.

Covers all edge cases for dollar-to-cents conversion, percentage cleaning,
employee count cleaning, department name normalization, and data validation.
"""

import pytest
from pipeline.transform.clean import (
    dollars_to_cents,
    clean_percentage,
    clean_employee_count,
    clean_department_name,
)
from pipeline.transform.validate import validate_extracted_data


# ============================================================
# dollars_to_cents tests
# ============================================================


class TestDollarsToCents:
    """Test dollars_to_cents with all observed budget PDF formats."""

    def test_standard_dollar_string(self):
        assert dollars_to_cents("$1,234,567") == 123456700

    def test_no_dollar_sign(self):
        assert dollars_to_cents("1,234,567") == 123456700

    def test_parentheses_negative(self):
        """Parentheses indicate negative values (budget convention)."""
        assert dollars_to_cents("($1,234)") == -123400

    def test_minus_sign_negative(self):
        assert dollars_to_cents("-$500") == -50000

    def test_decimal_value(self):
        assert dollars_to_cents("1234.56") == 123456

    def test_empty_string(self):
        assert dollars_to_cents("") == 0

    def test_dash(self):
        assert dollars_to_cents("-") == 0

    def test_na_string(self):
        assert dollars_to_cents("N/A") == 0

    def test_none_value(self):
        assert dollars_to_cents(None) == 0

    def test_zero_dollar(self):
        assert dollars_to_cents("$0") == 0

    def test_full_budget_total(self):
        """The full FY 2025-26 budget total: $13,233,238,000."""
        assert dollars_to_cents("$13,233,238,000") == 1323323800000

    def test_returns_int_type(self):
        """Must always return int, never float."""
        result = dollars_to_cents("$1,234,567")
        assert isinstance(result, int)

    def test_decimal_returns_int_type(self):
        """Even decimal inputs must return int."""
        result = dollars_to_cents("1234.56")
        assert isinstance(result, int)

    def test_whitespace_handling(self):
        assert dollars_to_cents("  $1,000  ") == 100000

    def test_double_dash(self):
        assert dollars_to_cents("--") == 0

    def test_em_dash(self):
        assert dollars_to_cents("\u2014") == 0

    def test_na_lowercase(self):
        assert dollars_to_cents("n/a") == 0

    def test_large_negative_parentheses(self):
        assert dollars_to_cents("($10,500,000)") == -1050000000

    def test_numeric_input(self):
        """Should handle numeric input (not just strings)."""
        assert dollars_to_cents(1000) == 100000

    def test_zero_integer(self):
        assert dollars_to_cents(0) == 0

    def test_decimal_rounding(self):
        """Test that decimal cents round correctly."""
        # $1.555 should round to 156 cents
        assert dollars_to_cents("1.555") == 156

    def test_operating_budget_scale(self):
        """Operating budget: $8,575,606,000."""
        assert dollars_to_cents("$8,575,606,000") == 857560600000

    def test_capital_budget_scale(self):
        """Capital budget: $4,657,632,000."""
        assert dollars_to_cents("$4,657,632,000") == 465763200000


# ============================================================
# clean_percentage tests
# ============================================================


class TestCleanPercentage:
    """Test clean_percentage with various input formats."""

    def test_with_percent_sign(self):
        assert clean_percentage("25.3%") == 25.3

    def test_without_percent_sign(self):
        assert clean_percentage("25.3") == 25.3

    def test_empty_string(self):
        assert clean_percentage("") is None

    def test_none_value(self):
        assert clean_percentage(None) is None

    def test_dash(self):
        assert clean_percentage("-") is None

    def test_integer_percentage(self):
        assert clean_percentage("100%") == 100.0

    def test_small_percentage(self):
        assert clean_percentage("0.5%") == 0.5

    def test_na_string(self):
        assert clean_percentage("N/A") is None


# ============================================================
# clean_employee_count tests
# ============================================================


class TestCleanEmployeeCount:
    """Test clean_employee_count with various formats."""

    def test_with_commas(self):
        assert clean_employee_count("3,500") == 3500

    def test_without_commas(self):
        assert clean_employee_count("3500") == 3500

    def test_empty_string(self):
        assert clean_employee_count("") is None

    def test_none_value(self):
        assert clean_employee_count(None) is None

    def test_dash(self):
        assert clean_employee_count("-") is None

    def test_large_count(self):
        assert clean_employee_count("31,996") == 31996

    def test_single_digit(self):
        assert clean_employee_count("5") == 5

    def test_na_string(self):
        assert clean_employee_count("N/A") is None


# ============================================================
# clean_department_name tests
# ============================================================


class TestCleanDepartmentName:
    """Test clean_department_name normalization."""

    def test_strip_whitespace(self):
        assert clean_department_name("  Fire Rescue  ") == "Fire Rescue"

    def test_unicode_quotes(self):
        assert clean_department_name("County Attorney\u2019s Office") == "County Attorney's Office"

    def test_unicode_dashes(self):
        assert clean_department_name("Parks\u2013Recreation") == "Parks-Recreation"

    def test_footnote_asterisk(self):
        assert clean_department_name("Fire Rescue*") == "Fire Rescue"

    def test_footnote_plus(self):
        assert clean_department_name("Sheriff+") == "Sheriff"

    def test_footnote_dagger(self):
        assert clean_department_name("Aviation\u2020") == "Aviation"

    def test_multiple_spaces(self):
        assert clean_department_name("Fire   Rescue") == "Fire Rescue"

    def test_empty_string(self):
        assert clean_department_name("") == ""

    def test_none_value(self):
        assert clean_department_name(None) == ""

    def test_normal_name_unchanged(self):
        assert clean_department_name("Fire Rescue") == "Fire Rescue"


# ============================================================
# validate_extracted_data tests
# ============================================================


class TestValidateExtractedData:
    """Test structural validation of extraction output."""

    def _make_valid_data(self):
        """Create a minimal valid extraction output."""
        departments = []
        for i in range(35):
            departments.append({
                "name": f"Department {i}",
                "strategic_area": "Public Safety",
                "operating_budget": "$1,000,000",
                "capital_budget": "$500,000",
                "total_budget": "$1,500,000",
            })

        return {
            "strategic_areas": [{"name": f"Area {i}"} for i in range(9)],
            "departments": departments,
            "revenue": [{"name": f"Source {i}"} for i in range(7)],
            "expenditures": [{"name": f"Category {i}"} for i in range(9)],
            "millage": [{"authority": "County", "rate": "1.0000"}],
            "penny": [{"area": "Public Safety", "cents": "19"}],
        }

    def test_valid_data_no_issues(self):
        data = self._make_valid_data()
        issues = validate_extracted_data(data)
        assert len(issues) == 0

    def test_empty_strategic_areas(self):
        data = self._make_valid_data()
        data["strategic_areas"] = []
        issues = validate_extracted_data(data)
        assert any("strategic_areas is empty" in i for i in issues)

    def test_empty_departments(self):
        data = self._make_valid_data()
        data["departments"] = []
        issues = validate_extracted_data(data)
        assert any("departments is empty" in i for i in issues)

    def test_missing_strategic_area_field(self):
        data = self._make_valid_data()
        data["departments"][0] = {"name": "Bad Dept", "operating_budget": "$100"}
        issues = validate_extracted_data(data)
        assert any("missing strategic_area" in i for i in issues)

    def test_empty_revenue(self):
        data = self._make_valid_data()
        data["revenue"] = []
        issues = validate_extracted_data(data)
        assert any("revenue is empty" in i for i in issues)

    def test_empty_millage(self):
        data = self._make_valid_data()
        data["millage"] = []
        issues = validate_extracted_data(data)
        assert any("millage is empty" in i for i in issues)

    def test_wrong_strategic_area_count(self):
        data = self._make_valid_data()
        data["strategic_areas"] = [{"name": f"Area {i}"} for i in range(7)]
        issues = validate_extracted_data(data)
        assert any("Expected 9 strategic areas" in i for i in issues)
