-- ============================================================
-- Migration 007: Budget Stage Contract
-- Miami-Dade County Budget Explorer
-- Abreu Data Works LLC
--
-- Contract half of the expand/contract cycle started by 006.
-- Drops the two objects that reference is_actual, swaps the
-- unique keys to stage-based ones, drops the is_actual boolean,
-- drops the transitional stage defaults, and recreates the views
-- with stage = 'adopted' predicates.
--
-- Ordering matters: PostgreSQL refuses DROP COLUMN while
-- dependent views exist. Explicit drops (never CASCADE) keep the
-- recreation list honest.
-- ============================================================

-- 1. Drop the only two objects referencing is_actual
--    (verified complete via pg_depend in the 07-01 pre-flight)
DROP MATERIALIZED VIEW search_index;
DROP VIEW v_department_yoy;

-- 2. Swap unique keys (EXACT live names verified byte-for-byte on
--    local and prod in 07-01 -- two are PG-truncated)
ALTER TABLE department_budgets
    DROP CONSTRAINT department_budgets_fy_dept_area_actual_key,
    ADD CONSTRAINT department_budgets_fy_dept_area_stage_key
        UNIQUE (fiscal_year_id, department_id, strategic_area_id, stage);
ALTER TABLE department_expenditures
    DROP CONSTRAINT department_expenditures_fiscal_year_id_department_id_expend_key,
    ADD CONSTRAINT department_expenditures_fy_dept_cat_stage_key
        UNIQUE (fiscal_year_id, department_id, expenditure_category_id, stage);
ALTER TABLE revenue_by_source
    DROP CONSTRAINT revenue_by_source_fiscal_year_id_revenue_source_id_is_actua_key,
    ADD CONSTRAINT revenue_by_source_fy_source_stage_key
        UNIQUE (fiscal_year_id, revenue_source_id, stage);
ALTER TABLE millage_rates
    DROP CONSTRAINT millage_rates_fiscal_year_id_authority_key,
    ADD CONSTRAINT millage_rates_fy_authority_stage_key
        UNIQUE (fiscal_year_id, authority, stage);
ALTER TABLE strategic_area_budgets
    DROP CONSTRAINT strategic_area_budgets_fiscal_year_id_strategic_area_id_key,
    ADD CONSTRAINT strategic_area_budgets_fy_area_stage_key
        UNIQUE (fiscal_year_id, strategic_area_id, stage);

-- 3. Drop the boolean
ALTER TABLE department_budgets      DROP COLUMN is_actual;
ALTER TABLE department_expenditures DROP COLUMN is_actual;
ALTER TABLE revenue_by_source       DROP COLUMN is_actual;

-- 4. Drop transitional defaults: future INSERTs must state their
--    stage explicitly
ALTER TABLE department_budgets      ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE department_expenditures ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE revenue_by_source      ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE millage_rates           ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE strategic_area_budgets  ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE budget_descriptions     ALTER COLUMN stage DROP DEFAULT;

-- 5. Recreate v_department_yoy (definition verbatim from migration
--    003, with the is_actual predicate swapped to stage)
-- YoY view: partition by (dept, area) for multi-area departments
CREATE VIEW v_department_yoy AS
SELECT
    d.name AS department,
    d.slug,
    sa.name AS strategic_area,
    fy.label AS fiscal_year,
    db.operating_budget,
    db.capital_budget,
    db.employee_count,
    LAG(db.operating_budget) OVER (
        PARTITION BY d.id, db.strategic_area_id ORDER BY fy.start_date
    ) AS prior_operating,
    LAG(db.employee_count) OVER (
        PARTITION BY d.id, db.strategic_area_id ORDER BY fy.start_date
    ) AS prior_employees
FROM department_budgets db
JOIN departments d ON d.id = db.department_id
JOIN strategic_areas sa ON sa.id = COALESCE(db.strategic_area_id, d.strategic_area_id)
JOIN fiscal_years fy ON fy.id = db.fiscal_year_id
WHERE db.stage = 'adopted'
ORDER BY d.name, fy.start_date;

-- 6. Recreate search_index (definition verbatim from migration 005,
--    with the is_actual predicate swapped to stage). CREATE
--    MATERIALIZED VIEW populates WITH DATA by default.
CREATE MATERIALIZED VIEW search_index AS

-- Departments: name (A weight) + AI summary + key_changes (B weight)
SELECT
    'department' AS entity_type,
    d.id AS entity_id,
    d.name AS title,
    d.slug,
    COALESCE(bd.summary, '') AS snippet,
    sa.name AS area_name,
    sa.color AS area_color,
    sa.slug AS area_slug,
    db.operating_budget,
    sab.cents_per_dollar,
    setweight(to_tsvector('english', d.name), 'A') ||
    setweight(to_tsvector('english', COALESCE(bd.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(bd.key_changes, '')), 'B') AS search_vector
FROM departments d
JOIN strategic_areas sa ON d.strategic_area_id = sa.id
LEFT JOIN budget_descriptions bd ON bd.entity_type = 'department'
    AND bd.entity_id = d.id
    AND bd.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
LEFT JOIN (
    -- One department can hold several budget rows per fiscal year
    -- (one per strategic area, plus capital-only rows); sum them.
    SELECT department_id, SUM(operating_budget) AS operating_budget
    FROM department_budgets
    WHERE fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
      AND stage = 'adopted'
    GROUP BY department_id
) db ON db.department_id = d.id
LEFT JOIN strategic_area_budgets sab ON sab.strategic_area_id = sa.id
    AND sab.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')

UNION ALL

-- Strategic areas: name (A weight) + description (B weight)
SELECT
    'strategic_area' AS entity_type,
    sa.id AS entity_id,
    sa.name AS title,
    sa.slug,
    COALESCE(sa.description, '') AS snippet,
    sa.name AS area_name,
    sa.color AS area_color,
    sa.slug AS area_slug,
    sab.operating_budget,
    sab.cents_per_dollar,
    setweight(to_tsvector('english', sa.name), 'A') ||
    setweight(to_tsvector('english', COALESCE(sa.description, '')), 'B') AS search_vector
FROM strategic_areas sa
LEFT JOIN strategic_area_budgets sab ON sab.strategic_area_id = sa.id
    AND sab.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')

UNION ALL

-- Glossary terms: term (A weight) + definition (B weight)
SELECT
    'glossary' AS entity_type,
    gt.id AS entity_id,
    gt.term AS title,
    gt.slug,
    gt.definition AS snippet,
    NULL::varchar AS area_name,
    NULL::varchar AS area_color,
    NULL::varchar AS area_slug,
    NULL::bigint AS operating_budget,
    NULL::int AS cents_per_dollar,
    setweight(to_tsvector('english', gt.term), 'A') ||
    setweight(to_tsvector('english', gt.definition), 'B') AS search_vector
FROM glossary_terms gt;

-- GIN index for fast full-text lookups
CREATE INDEX idx_search_index_fts ON search_index USING gin(search_vector);

-- NOTE: refresh after every pipeline run:
--   REFRESH MATERIALIZED VIEW search_index;
