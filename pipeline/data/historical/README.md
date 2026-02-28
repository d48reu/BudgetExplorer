# Historical Budget Data

This directory contains CSV/JSON files for seeding prior fiscal year budget data
into the Budget Explorer database. For fiscal years not covered by the current
Budget in Brief PDF, create files here using the schema below.

## CSV Schema

Files should be named `fy_YYYY_YY_departments.csv` (e.g., `fy_2021_22_departments.csv`).

### Columns

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| fiscal_year | string | Yes | Fiscal year label (e.g., "FY 2021-22") |
| strategic_area | string | Yes | Strategic area name (e.g., "Public Safety") |
| department_name | string | Yes | Department name as it appeared in that fiscal year |
| department_alias | string | No | Current department name if the department was renamed (blank if same) |
| operating_budget | integer | Yes | Operating budget in **whole dollars** (not cents) |
| capital_budget | integer | Yes | Capital budget in **whole dollars** (not cents) |
| employee_count | integer | No | Number of employees (blank if unknown) |
| is_actual | boolean | No | "true" for actual spending, "false" for adopted budget (default: false) |

### Department Aliases

If a department was renamed between fiscal years, put the old name in
`department_name` and the current name in `department_alias`. The loader
resolves departments by matching against the current database.

Example: In FY 2021-22, "Miami-Dade Police Department" existed. In FY 2025-26
it became "Sheriff" (constitutional office). So for a FY 2021-22 row:

```
department_name = "Miami-Dade Police Department"
department_alias = "Sheriff"
```

Leave `department_alias` blank if the name has not changed.

### Dollar Amounts

The `operating_budget` and `capital_budget` columns are in **whole dollars**,
not cents. The loader converts to cents automatically (value * 100).

Example: $2,345,678,000 is entered as `2345678000`.

### JSON Alternative

You can also provide data in JSON format. Name files `fy_YYYY_YY_departments.json`.
The JSON format is an array of objects with the same field names as the CSV columns.

```json
[
  {
    "fiscal_year": "FY 2021-22",
    "strategic_area": "Public Safety",
    "department_name": "Miami-Dade Police Department",
    "department_alias": "Sheriff",
    "operating_budget": 2345678000,
    "capital_budget": 123456000,
    "employee_count": 4500,
    "is_actual": false
  }
]
```

## Usage

Seed all historical files in this directory:
```bash
python -m pipeline.cli seed-historical --data-dir pipeline/data/historical/
```

Seed a single file:
```bash
python -m pipeline.cli seed-historical-file --file fy_2021_22_departments.csv --fiscal-year "FY 2021-22"
```

## Target Fiscal Years

The goal is 5 fiscal years of data:
- FY 2021-22
- FY 2022-23
- FY 2023-24
- FY 2024-25
- FY 2025-26 (loaded automatically from Budget in Brief PDF)

See `template.csv` for an example of the expected format.
