-- ============================================================
-- Migration 005: Search Index Budget Fix
-- Miami-Dade County Budget Explorer
-- Abreu Data Works LLC
--
-- Migration 004 joined department_budgets with
-- "db.strategic_area_id IS NULL", but every seeded row carries a
-- strategic_area_id, so the join matched zero rows and every
-- department search result had a NULL operating_budget. Rebuild
-- the view with a per-department aggregate that sums the
-- department's budget slices across strategic areas.
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS search_index;

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
      AND is_actual = false
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
CREATE INDEX IF NOT EXISTS idx_search_index_fts ON search_index USING gin(search_vector);

-- NOTE: refresh after every pipeline run:
--   REFRESH MATERIALIZED VIEW search_index;
