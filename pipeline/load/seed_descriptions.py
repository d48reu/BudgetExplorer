"""Seed AI-generated department descriptions into the budget_descriptions table.

Reads a reviewed JSON file produced by pipeline.generate.descriptions and
inserts descriptions into the database. Uses a DELETE-then-INSERT pattern
for idempotency -- safe to re-run.

Usage:
    python -m pipeline.load.seed_descriptions [path/to/descriptions.json]
"""

import json
import os
import sys

from pipeline.config import CURRENT_FISCAL_YEAR
from pipeline.load.db import get_db_connection

DEFAULT_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "descriptions",
    "fy_2025_26_descriptions.json",
)


def seed_descriptions(json_path: str):
    """Read reviewed JSON and insert descriptions into budget_descriptions.

    For each department in the JSON file:
    1. Looks up department_id from departments table by slug
    2. Deletes any existing description for this department + fiscal year
    3. Inserts the new description with all metadata

    Args:
        json_path: Path to the reviewed descriptions JSON file.

    Raises:
        FileNotFoundError: If the JSON file doesn't exist.
        ValueError: If the JSON file is empty or invalid.
    """
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Descriptions file not found: {json_path}")

    with open(json_path) as f:
        data = json.load(f)

    # Support both flat dict and nested {metadata, descriptions} format
    if "descriptions" in data:
        descriptions = data["descriptions"]
    else:
        descriptions = data

    if not descriptions:
        raise ValueError("No descriptions found in JSON file.")

    print(f"Loaded {len(descriptions)} descriptions from {json_path}")

    with get_db_connection() as conn:
        cur = conn.cursor()

        # Look up current fiscal year id
        cur.execute(
            "SELECT id FROM fiscal_years WHERE label = %s",
            (CURRENT_FISCAL_YEAR,),
        )
        row = cur.fetchone()
        if not row:
            print(f"Error: Fiscal year '{CURRENT_FISCAL_YEAR}' not found in database.")
            cur.close()
            return

        fiscal_year_id = row[0]
        print(f"Fiscal year: {CURRENT_FISCAL_YEAR} (id={fiscal_year_id})")

        seeded = 0
        skipped = 0

        for slug, desc in descriptions.items():
            # Look up department_id by slug
            cur.execute(
                "SELECT id FROM departments WHERE slug = %s",
                (slug,),
            )
            dept_row = cur.fetchone()
            if not dept_row:
                print(f"  Warning: Department slug '{slug}' not found -- skipping")
                skipped += 1
                continue

            department_id = dept_row[0]

            # Delete existing description (idempotent); stage-scoped so
            # adopted descriptions never clobber proposed ones (or vice versa)
            cur.execute(
                "DELETE FROM budget_descriptions "
                "WHERE fiscal_year_id = %s AND entity_type = 'department' "
                "AND entity_id = %s AND stage = 'adopted'",
                (fiscal_year_id, department_id),
            )

            # Insert new description (stage literal for now; Phase 13
            # parameterizes when descriptions regenerate per stage)
            cur.execute(
                "INSERT INTO budget_descriptions "
                "(fiscal_year_id, entity_type, entity_id, summary, "
                "detailed_description, key_changes, generated_at, "
                "model_version, stage) "
                "VALUES (%s, 'department', %s, %s, %s, %s, %s, %s, 'adopted')",
                (
                    fiscal_year_id,
                    department_id,
                    desc.get("summary", ""),
                    desc.get("detailed_description", ""),
                    desc.get("key_changes", ""),
                    desc.get("generated_at"),
                    desc.get("model_version"),
                ),
            )
            seeded += 1

        cur.close()

    print(f"\nSeeding complete!")
    print(f"  Seeded: {seeded} descriptions")
    if skipped:
        print(f"  Skipped: {skipped} (department not found)")
    print(f"  Table: budget_descriptions (fiscal_year_id={fiscal_year_id})")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_JSON_PATH
    seed_descriptions(path)
