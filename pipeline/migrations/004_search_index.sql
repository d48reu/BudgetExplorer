-- ============================================================
-- Migration 004: Full-Text Search Index
-- Miami-Dade County Budget Explorer
-- Abreu Data Works LLC
--
-- Creates glossary_terms table, seeds glossary data,
-- and builds search_index materialized view with GIN index
-- for full-text search across departments, strategic areas,
-- and glossary terms.
-- ============================================================

-- Part A: Glossary terms table
CREATE TABLE IF NOT EXISTS glossary_terms (
    id         SERIAL PRIMARY KEY,
    term       VARCHAR(100) NOT NULL UNIQUE,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    definition TEXT NOT NULL
);

-- Part B: Seed glossary terms (idempotent via ON CONFLICT)
INSERT INTO glossary_terms (term, slug, definition) VALUES
    ('Ad Valorem Tax', 'ad-valorem-tax',
     'A property tax based on the assessed value of your home or business. "Ad valorem" means "according to value" in Latin. This is the main way Miami-Dade County raises revenue.'),
    ('Adopted Budget', 'adopted-budget',
     'The final spending plan approved by the Board of County Commissioners for a fiscal year. Once adopted, it authorizes departments to spend up to their budgeted amounts.'),
    ('Capital Budget', 'capital-budget',
     'Money set aside for building, buying, or improving long-term assets like roads, parks, buildings, and transit systems. These are one-time investments, not ongoing operating costs.'),
    ('Enterprise Fund', 'enterprise-fund',
     'A self-sustaining county service that operates like a business, funded by fees rather than taxes. Examples include Water and Sewer, Solid Waste, and Aviation (airports). Users of the service pay for it directly.'),
    ('Fiscal Year', 'fiscal-year',
     'The county''s 12-month budget cycle, which runs from October 1 to September 30. "FY 2025-26" means October 2025 through September 2026.'),
    ('Fringes', 'fringes',
     'Employee benefit costs beyond salary, including health insurance, retirement contributions, Social Security, and workers'' compensation. Fringes typically add 30-40% on top of base salary costs.'),
    ('General Fund', 'general-fund',
     'The county''s main operating account, funded primarily by property taxes. It pays for core services like police, fire rescue, parks, libraries, and public works that benefit all residents.'),
    ('Homestead Exemption', 'homestead-exemption',
     'A tax break for Florida residents who own and live in their primary home. It reduces the taxable value of your property by up to $50,000, lowering your annual property tax bill.'),
    ('Millage Rate', 'millage-rate',
     'The tax rate applied to property values, expressed as dollars per $1,000 of assessed value. A millage rate of 5.0 means you pay $5 for every $1,000 your property is worth.'),
    ('Operating Budget', 'operating-budget',
     'The day-to-day spending plan covering ongoing costs like employee salaries, utilities, supplies, and maintenance. This is what it costs to keep county services running each year.'),
    ('Strategic Area', 'strategic-area',
     'One of nine broad categories the county uses to organize its departments and spending priorities, such as Public Safety, Transportation, and Neighborhood and Infrastructure.')
ON CONFLICT (term) DO NOTHING;

-- Part C: Search index materialized view
-- Unions departments, strategic areas, and glossary terms into a single
-- searchable view with weighted tsvector columns for full-text search.
CREATE MATERIALIZED VIEW IF NOT EXISTS search_index AS

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
LEFT JOIN department_budgets db ON db.department_id = d.id
    AND db.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
    AND db.is_actual = false
    AND db.strategic_area_id IS NULL
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

-- NOTE: The search_index materialized view is a snapshot of data at creation time.
-- After any data pipeline run (loading new budget data, adding descriptions, etc.),
-- you must refresh the view:
--   REFRESH MATERIALIZED VIEW search_index;
