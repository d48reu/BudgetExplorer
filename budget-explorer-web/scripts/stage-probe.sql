-- ============================================================
-- Stage-Probe Fixture: proposed-row leak detector
-- Miami-Dade County Budget Explorer
-- Abreu Data Works LLC
--
-- Inserts ONE proposed-stage row into each of the six staged
-- tables, with unmissable sentinel values ($999,999,999,999 /
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
