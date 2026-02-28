"""Extraction modules for the Budget in Brief PDF.

Provides per-section extractors and a combined extract_all() function
that runs all extractors and returns a unified dict.
"""

from pipeline.extract.pdf_reader import download_pdf, open_pdf, inspect_pdf
from pipeline.extract.strategic_areas import extract_strategic_areas
from pipeline.extract.departments import extract_departments
from pipeline.extract.revenue import extract_revenue
from pipeline.extract.expenditures import extract_expenditures
from pipeline.extract.millage import extract_millage
from pipeline.extract.penny import extract_penny

__all__ = [
    "download_pdf",
    "open_pdf",
    "inspect_pdf",
    "extract_strategic_areas",
    "extract_departments",
    "extract_revenue",
    "extract_expenditures",
    "extract_millage",
    "extract_penny",
    "extract_all",
]


def extract_all(pdf_path: str) -> dict:
    """Run all extraction modules and return a combined dict.

    The returned dict has keys:
        - strategic_areas: list[dict] from extract_strategic_areas()
        - departments: list[dict] from extract_departments()
        - revenue: list[dict] from extract_revenue()
        - expenditures: list[dict] from extract_expenditures()
        - millage: list[dict] from extract_millage()
        - penny: list[dict] from extract_penny()

    All values are raw strings from the PDF. The transform module
    handles conversion to cents and validation.

    Args:
        pdf_path: Path to the Budget in Brief PDF.

    Returns:
        Combined dict with all extracted data sections.
    """
    print("Extracting strategic areas...")
    strategic_areas = extract_strategic_areas(pdf_path)
    print(f"  Found {len(strategic_areas)} strategic areas")

    print("Extracting departments...")
    departments = extract_departments(pdf_path)
    print(f"  Found {len(departments)} departments")

    print("Extracting revenue sources...")
    revenue = extract_revenue(pdf_path)
    print(f"  Found {len(revenue)} revenue sources")

    print("Extracting expenditure categories...")
    expenditures = extract_expenditures(pdf_path)
    print(f"  Found {len(expenditures)} expenditure categories")

    print("Extracting millage rates...")
    millage = extract_millage(pdf_path)
    print(f"  Found {len(millage)} millage entries")

    print("Extracting penny breakdown...")
    penny = extract_penny(pdf_path)
    print(f"  Found {len(penny)} penny entries")

    return {
        "strategic_areas": strategic_areas,
        "departments": departments,
        "revenue": revenue,
        "expenditures": expenditures,
        "millage": millage,
        "penny": penny,
    }
