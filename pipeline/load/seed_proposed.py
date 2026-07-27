"""Idempotent loader for the FY 2026-27 proposed-budget dataset."""

import re

from pipeline.load.seed import (
    _build_department_lookup,
    _resolve_department_id,
    seed_budget_release,
    seed_fiscal_year,
    seed_millage_rates,
    seed_revenue,
)
from pipeline.transform.clean import clean_department_name


def _slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or "unnamed"


def _seed_priorities(cur, priorities: list[dict]) -> dict[str, int]:
    ids = {}
    for priority in priorities:
        cur.execute("""
            INSERT INTO strategic_areas
                (name, slug, description, display_order, color)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (name) DO NOTHING
            RETURNING id
        """, (
            priority["name"],
            priority["slug"],
            priority.get("description"),
            priority["display_order"],
            priority.get("color"),
        ))
        row = cur.fetchone()
        if row is None:
            cur.execute(
                "SELECT id FROM strategic_areas WHERE name = %s",
                (priority["name"],),
            )
            row = cur.fetchone()
        ids[priority["name"]] = row[0]
    return ids


def _resolve_or_create_department(cur, name: str, priority_id: int,
                                  lookup: dict) -> int:
    clean_name = clean_department_name(name)
    department_id = _resolve_department_id(clean_name, lookup)
    if department_id is not None:
        return department_id

    slug = _slugify(clean_name)
    cur.execute("""
        INSERT INTO departments (strategic_area_id, name, slug)
        VALUES (%s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
    """, (priority_id, clean_name, slug))
    department_id = cur.fetchone()[0]
    lookup[clean_name.lower()] = department_id
    lookup[slug] = department_id
    return department_id


def seed_proposed_all(conn, data: dict) -> dict:
    """Load proposed release, priorities, department slices, and tax inputs."""
    if data.get("format") != "proposed-budget-v1":
        raise ValueError("Unsupported proposed budget data format")
    if data.get("stage") != "proposed":
        raise ValueError("Proposed budget dataset must declare stage=proposed")

    release = data["release"]
    fiscal_year_id = seed_fiscal_year(
        conn,
        data["fiscal_year"],
        "2026-10-01",
        "2027-09-30",
        release,
        is_adopted=False,
    )
    seed_budget_release(conn, fiscal_year_id, "proposed", release, release)

    cur = conn.cursor()
    priority_ids = _seed_priorities(cur, data["priorities"])
    department_lookup = _build_department_lookup(cur)

    cur.execute(
        "DELETE FROM department_budgets "
        "WHERE fiscal_year_id = %s AND stage = 'proposed'",
        (fiscal_year_id,),
    )
    for budget in data["department_budgets"]:
        priority_id = priority_ids[budget["priority"]]
        department_id = _resolve_or_create_department(
            cur, budget["department"], priority_id, department_lookup
        )
        cur.execute("""
            INSERT INTO department_budgets
                (fiscal_year_id, department_id, strategic_area_id,
                 operating_budget, capital_budget, total_budget,
                 employee_count, baseline_operating_budget,
                 baseline_employee_count, stage)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'proposed')
        """, (
            fiscal_year_id,
            department_id,
            priority_id,
            budget["operating_cents"],
            budget["capital_cents"],
            budget["total_budget_cents"],
            budget.get("employee_count"),
            budget.get("restated_adopted_operating_cents"),
            budget.get("restated_adopted_positions"),
        ))

    cur.execute(
        "DELETE FROM strategic_area_budgets "
        "WHERE fiscal_year_id = %s AND stage = 'proposed'",
        (fiscal_year_id,),
    )
    for priority in data["priorities"]:
        cur.execute("""
            INSERT INTO strategic_area_budgets
                (fiscal_year_id, strategic_area_id, operating_budget,
                 capital_budget, cents_per_dollar, stage)
            VALUES (%s, %s, %s, %s, %s, 'proposed')
        """, (
            fiscal_year_id,
            priority_ids[priority["name"]],
            priority["operating_cents"],
            priority["capital_cents"],
            priority["cents_per_dollar"],
        ))
    cur.close()

    seed_revenue(conn, fiscal_year_id, data.get("revenue", []), stage="proposed")
    seed_millage_rates(
        conn, fiscal_year_id, data.get("millage", []), stage="proposed"
    )

    cur = conn.cursor()
    cur.execute("REFRESH MATERIALIZED VIEW search_index")
    cur.close()

    return {
        "fiscal_year_id": fiscal_year_id,
        "strategic_areas": len(data["priorities"]),
        "departments": len(data["department_budgets"]),
        "revenue": len(data.get("revenue", [])),
        "millage": len(data.get("millage", [])),
    }
