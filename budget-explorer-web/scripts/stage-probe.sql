-- ============================================================
-- Stage-Probe Fixture: proposed-row leak detector
-- Miami-Dade County Budget Explorer
-- Abreu Data Works LLC
--
-- Inserts proposed-stage rows into every staged table, with
-- unmissable sentinel values ($999,999,999,999 /
-- 99.9999 mills / PROBE LEAK text). Run against a SCRATCH CLONE
-- of the database, then re-crawl the site: if any rendered byte
-- changes, a reader query is missing its stage filter.
--
-- Usage (Phases 8-13 regression drill):
--   createdb budget_explorer_probe -T budget_explorer
--   psql <probe-db-url> -v ON_ERROR_STOP=1 -f scripts/stage-probe.sql
--   ... build + crawl + normalized diff must be identical ...
--   dropdb budget_explorer_probe
--
-- All FKs resolved via subselects (no hardcoded ids). Every
-- INSERT states its stage explicitly -- the transitional DB
-- defaults were dropped by migration 007.
-- ============================================================

-- 1. department_budgets: existing department in its home area
INSERT INTO department_budgets
    (fiscal_year_id, department_id, strategic_area_id,
     operating_budget, capital_budget, total_budget, employee_count, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    (SELECT id FROM departments WHERE slug = 'sheriff'),
    (SELECT strategic_area_id FROM departments WHERE slug = 'sheriff'),
    99999999999900, 99999999999900, 99999999999900, 999999,
    'proposed'
);

-- 2. department_expenditures: same department x an existing category
INSERT INTO department_expenditures
    (fiscal_year_id, department_id, expenditure_category_id, amount, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    (SELECT id FROM departments WHERE slug = 'sheriff'),
    (SELECT id FROM expenditure_categories ORDER BY id LIMIT 1),
    99999999999900,
    'proposed'
);

-- 3. revenue_by_source: an existing revenue source
INSERT INTO revenue_by_source
    (fiscal_year_id, revenue_source_id, amount, percentage, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    (SELECT id FROM revenue_sources ORDER BY id LIMIT 1),
    99999999999900, 99.99,
    'proposed'
);

-- 4. millage_rates: an existing authority, wildly different rate
INSERT INTO millage_rates
    (fiscal_year_id, authority, millage_rate, is_county, display_order, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    (SELECT authority FROM millage_rates
       WHERE fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
       ORDER BY display_order LIMIT 1),
    99.9999, TRUE, 999,
    'proposed'
);

-- 5. strategic_area_budgets: an existing strategic area
INSERT INTO strategic_area_budgets
    (fiscal_year_id, strategic_area_id, operating_budget, capital_budget,
     cents_per_dollar, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    (SELECT id FROM strategic_areas ORDER BY id LIMIT 1),
    99999999999900, 99999999999900, 99,
    'proposed'
);

-- 6. budget_descriptions: proposed-stage text for an existing department
INSERT INTO budget_descriptions
    (fiscal_year_id, entity_type, entity_id, summary,
     detailed_description, key_changes, model_version, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    'department',
    (SELECT id FROM departments WHERE slug = 'sheriff'),
    'PROBE LEAK: this proposed-stage summary must never render on any page.',
    'PROBE LEAK: proposed-stage detailed description sentinel.',
    'PROBE LEAK: proposed-stage key changes sentinel.',
    'stage-probe',
    'proposed'
);

-- 7. capital_programs: proposed-stage program for an existing department
INSERT INTO capital_programs
    (fiscal_year_id, department_id, strategic_area_id, program_name,
     adopted_amount, multi_year_total, description, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    (SELECT id FROM departments WHERE slug = 'sheriff'),
    (SELECT strategic_area_id FROM departments WHERE slug = 'sheriff'),
    'PROBE LEAK: proposed capital program',
    99999999999900, 99999999999900,
    'PROBE LEAK: proposed-stage capital description sentinel.',
    'proposed'
);

-- 8. budget_releases: proposed-stage release metadata
INSERT INTO budget_releases
    (fiscal_year_id, stage, as_of_date, total_operating, total_capital,
     total_budget, total_employees, budget_in_brief_url)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    'proposed', DATE '2099-12-31', 99999999999900, 99999999999900,
    99999999999900, 999999, 'https://example.invalid/PROBE-LEAK.pdf'
);

-- Proposed-only dimensions are the important case the original probe missed.
-- They must not create adopted navigation, routes, counts, or search results.
INSERT INTO strategic_areas
    (name, slug, description, display_order, color)
VALUES (
    'PROBE LEAK Priority', 'probe-leak-priority',
    'PROBE LEAK: proposed-only strategic priority.', 999, '#FF00FF'
);

INSERT INTO departments
    (strategic_area_id, name, slug, abbreviation, description)
VALUES (
    (SELECT id FROM strategic_areas WHERE slug = 'probe-leak-priority'),
    'PROBE LEAK Department', 'probe-leak-department', 'LEAK',
    'PROBE LEAK: proposed-only department.'
);

INSERT INTO strategic_area_budgets
    (fiscal_year_id, strategic_area_id, operating_budget, capital_budget,
     cents_per_dollar, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    (SELECT id FROM strategic_areas WHERE slug = 'probe-leak-priority'),
    99999999999900, 99999999999900, 99, 'proposed'
);

INSERT INTO department_budgets
    (fiscal_year_id, department_id, strategic_area_id, operating_budget,
     capital_budget, total_budget, employee_count, stage)
VALUES (
    (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26'),
    (SELECT id FROM departments WHERE slug = 'probe-leak-department'),
    (SELECT id FROM strategic_areas WHERE slug = 'probe-leak-priority'),
    99999999999900, 99999999999900, 99999999999900, 999999, 'proposed'
);

-- Search is materialized, so refresh it before the crawl/diff gate.
REFRESH MATERIALIZED VIEW search_index;
