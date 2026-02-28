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
from pipeline.extract.appendix_c import extract_appendix_c
from pipeline.extract.appendix_j import extract_appendix_j

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
    "extract_appendix_c",
    "extract_appendix_j",
    "extract_all",
]


def extract_all(pdf_path: str, appendix_c_path: str = None,
                appendix_j_path: str = None) -> dict:
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

    result = {
        "strategic_areas": strategic_areas,
        "departments": departments,
        "revenue": revenue,
        "expenditures": expenditures,
        "millage": millage,
        "penny": penny,
    }

    # Appendix C: operating expenditures by department (authoritative)
    if appendix_c_path:
        print("Extracting Appendix C (operating expenditures)...")
        appendix_c = extract_appendix_c(appendix_c_path)
        print(f"  Found {len(appendix_c['departments'])} department entries")
        print(f"  Found {len(appendix_c['area_totals'])} area totals")
        print(f"  Grand total: {appendix_c.get('grand_total')}K")
        result["appendix_c"] = appendix_c

    # Appendix J: capital budget by department (authoritative)
    if appendix_j_path:
        print("Extracting Appendix J (capital budget)...")
        appendix_j = extract_appendix_j(appendix_j_path)
        print(f"  Found {len(appendix_j['departments'])} department entries")
        print(f"  Found {len(appendix_j['area_totals'])} area totals")
        print(f"  Grand total: {appendix_j.get('grand_total')}K")
        result["appendix_j"] = appendix_j

    return result
