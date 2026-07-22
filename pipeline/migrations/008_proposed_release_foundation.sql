-- ============================================================
-- Migration 008: Proposed Budget Release Foundation
--
-- Keeps release-level totals and provenance separate from the
-- fiscal-year identity, makes capital programs stage-aware, and
-- scopes the public search index to the adopted release.
-- ============================================================

CREATE TABLE budget_releases (
    id                  SERIAL PRIMARY KEY,
    fiscal_year_id      INTEGER NOT NULL REFERENCES fiscal_years(id),
    stage               budget_stage NOT NULL,
    as_of_date          DATE,
    published_at        TIMESTAMPTZ,
    total_operating     BIGINT CHECK (total_operating IS NULL OR total_operating >= 0),
    total_capital       BIGINT CHECK (total_capital IS NULL OR total_capital >= 0),
    total_budget        BIGINT CHECK (total_budget IS NULL OR total_budget >= 0),
    total_employees     INTEGER CHECK (total_employees IS NULL OR total_employees >= 0),
    budget_in_brief_url TEXT,
    volume_1_url        TEXT,
    volume_2_url        TEXT,
    volume_3_url        TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT budget_releases_fy_stage_key UNIQUE (fiscal_year_id, stage)
);

CREATE INDEX idx_budget_releases_fy ON budget_releases(fiscal_year_id);

-- Preserve the currently published adopted totals as release metadata.
INSERT INTO budget_releases (
    fiscal_year_id,
    stage,
    total_operating,
    total_capital,
    total_budget,
    total_employees
)
SELECT
    fy.id,
    'adopted'::budget_stage,
    fy.total_operating,
    fy.total_capital,
    fy.total_budget,
    fy.total_employees
FROM fiscal_years fy
WHERE EXISTS (
    SELECT 1
    FROM department_budgets db
    WHERE db.fiscal_year_id = fy.id
      AND db.stage = 'adopted'
)
ON CONFLICT (fiscal_year_id, stage) DO NOTHING;

-- Capital programs need the same release-stage separation as other facts.
ALTER TABLE capital_programs
    ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE capital_programs
    ALTER COLUMN stage DROP DEFAULT;
CREATE INDEX idx_capital_programs_fy_stage
    ON capital_programs(fiscal_year_id, stage);

-- Rebuild search with an explicit adopted-only boundary. Inner joins on the
-- adopted facts prevent proposed-only departments or priorities from leaking
-- into the existing public site.
DROP MATERIALIZED VIEW search_index;

CREATE MATERIALIZED VIEW search_index AS

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
JOIN (
    SELECT department_id, SUM(operating_budget) AS operating_budget
    FROM department_budgets
    WHERE fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
      AND stage = 'adopted'
    GROUP BY department_id
) db ON db.department_id = d.id
LEFT JOIN budget_descriptions bd ON bd.entity_type = 'department'
    AND bd.entity_id = d.id
    AND bd.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
    AND bd.stage = 'adopted'
LEFT JOIN strategic_area_budgets sab ON sab.strategic_area_id = sa.id
    AND sab.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
    AND sab.stage = 'adopted'

UNION ALL

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
JOIN strategic_area_budgets sab ON sab.strategic_area_id = sa.id
    AND sab.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
    AND sab.stage = 'adopted'

UNION ALL

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

CREATE INDEX idx_search_index_fts ON search_index USING gin(search_vector);
