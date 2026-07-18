"""AI description generation for Miami-Dade County department budgets.

Generates plain-English summaries, detailed descriptions, and key-changes
highlights for all 35 departments using the Anthropic Claude API.

Output is saved to a JSON file for human review before database seeding.

Usage:
    python -m pipeline.generate.descriptions
"""

import json
import os
import re
import time
from datetime import datetime, timezone

from anthropic import Anthropic
from pydantic import BaseModel

from pipeline.config import CURRENT_FISCAL_YEAR
from pipeline.load.db import get_db_connection


class DepartmentDescription(BaseModel):
    """Structured output for a single department's AI-generated description."""

    summary: str
    detailed_description: str
    key_changes: str


SYSTEM_PROMPT = """You are a civic communications writer for Miami-Dade County.
Write in plain English that any resident can understand -- no jargon, no acronyms, no budget-speak.
Think "county newsletter" tone.

Rules:
- Use specific dollar amounts (e.g., "$1.2 billion") and employee counts
- Never use words like: leverage, synergy, optimize, stakeholder, utilize, facilitate, enhance
- Write as if explaining to a neighbor who has never seen a budget document
- Be factual and neutral -- no political commentary or value judgments
- Reference the fiscal year in descriptions (e.g., "In FY 2025-26...")
"""

MODEL = "claude-sonnet-4-5-20250929"
OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "descriptions"
)
OUTPUT_FILENAME = "fy_2025_26_descriptions.json"


def fetch_department_data(conn) -> list[dict]:
    """Fetch all departments with current FY budget data and YoY comparison.

    Queries the v_department_yoy view for the current fiscal year, returning
    department name, slug, strategic area, budget figures, employee count,
    and prior-year comparison data.

    Args:
        conn: psycopg2 database connection.

    Returns:
        List of dicts with keys: department_id, department, slug,
        strategic_area, fiscal_year, operating_budget, capital_budget,
        employee_count, prior_operating, prior_employees.
    """
    cur = conn.cursor()

    # A department can hold several budget rows per fiscal year (one per
    # strategic area, plus capital-only rows), so SUM the slices per
    # department -- picking a single row would describe a partial budget.
    # Prior-year figures come from the fiscal year immediately before the
    # current one, summed the same way.
    cur.execute("""
        WITH current_rows AS (
            SELECT db.department_id,
                   SUM(db.operating_budget) AS operating_budget,
                   SUM(db.capital_budget) AS capital_budget,
                   SUM(db.employee_count) AS employee_count
            FROM department_budgets db
            JOIN fiscal_years fy ON fy.id = db.fiscal_year_id
            WHERE fy.label = %s AND db.is_actual = FALSE
            GROUP BY db.department_id
        ),
        prior_fy AS (
            SELECT id FROM fiscal_years
            WHERE start_date < (
                SELECT start_date FROM fiscal_years WHERE label = %s
            )
            ORDER BY start_date DESC
            LIMIT 1
        ),
        prior_rows AS (
            SELECT db.department_id,
                   SUM(db.operating_budget) AS prior_operating,
                   SUM(db.employee_count) AS prior_employees
            FROM department_budgets db
            WHERE db.fiscal_year_id = (SELECT id FROM prior_fy)
              AND db.is_actual = FALSE
            GROUP BY db.department_id
        )
        SELECT
            d.id AS department_id,
            d.name AS department,
            d.slug,
            sa.name AS strategic_area,
            %s AS fiscal_year,
            c.operating_budget,
            c.capital_budget,
            c.employee_count,
            p.prior_operating,
            p.prior_employees
        FROM current_rows c
        JOIN departments d ON d.id = c.department_id
        JOIN strategic_areas sa ON sa.id = d.strategic_area_id
        LEFT JOIN prior_rows p ON p.department_id = c.department_id
        ORDER BY d.id
    """, (CURRENT_FISCAL_YEAR, CURRENT_FISCAL_YEAR, CURRENT_FISCAL_YEAR))

    columns = [
        "department_id", "department", "slug", "strategic_area",
        "fiscal_year", "operating_budget", "capital_budget",
        "employee_count", "prior_operating", "prior_employees",
    ]

    rows = cur.fetchall()
    cur.close()

    return [dict(zip(columns, row)) for row in rows]


def _format_cents_as_dollars(cents) -> str:
    """Convert a value in cents (BigInt) to a human-readable dollar string.

    Args:
        cents: Integer cents value, or None.

    Returns:
        Formatted string like "$1.2 billion", "$450 million", or "$0".
    """
    if cents is None or cents == 0:
        return "$0"

    dollars = float(cents) / 100.0

    if abs(dollars) >= 1_000_000_000:
        return f"${dollars / 1_000_000_000:.1f} billion"
    elif abs(dollars) >= 1_000_000:
        return f"${dollars / 1_000_000:.1f} million"
    elif abs(dollars) >= 1_000:
        return f"${dollars / 1_000:.0f} thousand"
    else:
        return f"${dollars:,.0f}"


def _build_user_prompt(dept_data: dict) -> str:
    """Build the user prompt with department budget data for Claude.

    Args:
        dept_data: Dict from fetch_department_data with budget figures.

    Returns:
        Formatted prompt string with all relevant budget data.
    """
    name = dept_data["department"]
    area = dept_data["strategic_area"]
    fy = dept_data["fiscal_year"]

    operating = _format_cents_as_dollars(dept_data.get("operating_budget"))
    capital = _format_cents_as_dollars(dept_data.get("capital_budget"))

    total_cents = (dept_data.get("operating_budget") or 0) + (
        dept_data.get("capital_budget") or 0
    )
    total = _format_cents_as_dollars(total_cents)

    employees = dept_data.get("employee_count")
    employee_str = f"{employees:,}" if employees else "not reported"

    # Year-over-year changes
    prior_op = dept_data.get("prior_operating")
    prior_emp = dept_data.get("prior_employees")

    yoy_lines = []
    current_op = dept_data.get("operating_budget") or 0
    if prior_op and prior_op > 0:
        change_pct = ((current_op - prior_op) / prior_op) * 100
        direction = "increase" if change_pct > 0 else "decrease"
        yoy_lines.append(
            f"- Operating budget changed by {change_pct:+.1f}% "
            f"({direction} from {_format_cents_as_dollars(prior_op)} "
            f"to {_format_cents_as_dollars(current_op)})"
        )

    if prior_emp is not None and employees is not None:
        emp_change = employees - prior_emp
        if emp_change != 0:
            direction = "increase" if emp_change > 0 else "decrease"
            yoy_lines.append(
                f"- Employee count changed by {emp_change:+,} "
                f"({direction} from {prior_emp:,} to {employees:,})"
            )

    yoy_section = "\n".join(yoy_lines) if yoy_lines else "- No prior year data available for comparison"

    prompt = f"""Write a plain-English description for the {name} department in Miami-Dade County.

Department: {name}
Strategic Area: {area}
Fiscal Year: {fy}
Operating Budget: {operating}
Capital Budget: {capital}
Total Budget: {total}
Employees: {employee_str}

Year-over-Year Changes:
{yoy_section}

Provide three outputs:
1. "summary": A 2-3 sentence overview of what this department does and its budget size. Start with what the department does for residents, then mention budget.
2. "detailed_description": A 1-2 paragraph deeper explanation covering the department's role, how it serves residents, and how it fits within the {area} strategic area.
3. "key_changes": A 1-2 sentence highlight of what changed in {fy} compared to the prior year. If no prior data, note this is the first year of available data.

Return your response as a JSON object with these three fields."""

    return prompt


def generate_description(
    client: Anthropic, dept_data: dict
) -> DepartmentDescription:
    """Generate an AI description for a single department.

    Tries messages.parse() with Pydantic structured output first.
    Falls back to messages.create() with manual JSON extraction if the
    SDK version doesn't support parse().

    Args:
        client: Anthropic API client.
        dept_data: Dict from fetch_department_data.

    Returns:
        DepartmentDescription with summary, detailed_description, key_changes.

    Raises:
        ValueError: If description generation fails after retries.
    """
    user_prompt = _build_user_prompt(dept_data)

    # Try structured output via messages.parse() first
    try:
        response = client.messages.parse(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
            response_model=DepartmentDescription,
        )
        return response.parsed
    except (AttributeError, TypeError):
        # SDK version doesn't support parse() or response_model -- fall back to create()
        pass

    # Fallback: messages.create() with manual JSON extraction
    return _generate_with_manual_extraction(client, user_prompt)


def _generate_with_manual_extraction(
    client: Anthropic, user_prompt: str, retry: bool = True
) -> DepartmentDescription:
    """Generate description using messages.create() and extract JSON manually.

    Args:
        client: Anthropic API client.
        user_prompt: The formatted user prompt.
        retry: Whether to retry on parse failure.

    Returns:
        DepartmentDescription instance.

    Raises:
        ValueError: If JSON extraction fails after retry.
    """
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    text = response.content[0].text

    # Strip markdown code fences if present
    text = re.sub(r"^```json?\s*\n?|\n?```\s*$", "", text.strip())

    try:
        parsed_dict = json.loads(text)
        return DepartmentDescription(**parsed_dict)
    except (json.JSONDecodeError, ValueError) as exc:
        if retry:
            print(f"    Warning: JSON parse failed, retrying with explicit JSON prompt...")
            retry_prompt = user_prompt + "\n\nReturn ONLY valid JSON. No markdown, no explanation, just the JSON object."
            return _generate_with_manual_extraction(
                client, retry_prompt, retry=False
            )
        raise ValueError(f"Failed to extract valid JSON from response: {exc}")


def main():
    """Generate AI descriptions for all 35 departments and save to JSON.

    Creates an Anthropic client (uses ANTHROPIC_API_KEY from environment),
    fetches department data from the database, generates a description for
    each department with a 1-second delay between calls, and saves the
    results to a JSON file for human review.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set in environment.")
        print("Set it in your .env file or export it:")
        print("  export ANTHROPIC_API_KEY=sk-ant-...")
        return

    client = Anthropic()

    print(f"Fetching department data for {CURRENT_FISCAL_YEAR}...")

    with get_db_connection() as conn:
        departments = fetch_department_data(conn)

    if not departments:
        print("Error: No department data found. Is the database seeded?")
        return

    print(f"Found {len(departments)} departments. Starting generation...\n")

    descriptions = {}
    failed = []
    generated_at = datetime.now(timezone.utc).isoformat()

    for i, dept in enumerate(departments, 1):
        slug = dept["slug"]
        name = dept["department"]
        print(f"[{i}/{len(departments)}] Generating for {name}...")

        try:
            desc = generate_description(client, dept)
            descriptions[slug] = {
                "summary": desc.summary,
                "detailed_description": desc.detailed_description,
                "key_changes": desc.key_changes,
                "department_name": name,
                "department_id": dept["department_id"],
                "strategic_area": dept["strategic_area"],
                "fiscal_year": dept["fiscal_year"],
                "model_version": MODEL,
                "generated_at": generated_at,
            }
            print(f"    OK ({len(desc.summary)} chars summary)")
        except Exception as exc:
            print(f"    FAILED: {exc}")
            failed.append({"slug": slug, "name": name, "error": str(exc)})

        # Rate limiting: 1 second delay between API calls
        if i < len(departments):
            time.sleep(1)

    # Save output
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, OUTPUT_FILENAME)

    output = {
        "metadata": {
            "fiscal_year": CURRENT_FISCAL_YEAR,
            "generated_at": generated_at,
            "model": MODEL,
            "total_departments": len(departments),
            "successful": len(descriptions),
            "failed": len(failed),
        },
        "descriptions": descriptions,
    }

    if failed:
        output["metadata"]["failed_departments"] = failed

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nGeneration complete!")
    print(f"  Successful: {len(descriptions)}/{len(departments)}")
    if failed:
        print(f"  Failed: {len(failed)}")
        for f_dept in failed:
            print(f"    - {f_dept['name']}: {f_dept['error']}")
    print(f"\nOutput saved to: {output_path}")
    print(f"Review the JSON file, then run:")
    print(f"  python -m pipeline.load.seed_descriptions")


if __name__ == "__main__":
    main()
