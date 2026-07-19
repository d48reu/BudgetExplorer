-- Migration A (expand): budget_stage enum + stage columns on all six tables.
-- Strictly additive: no constraint changes, no view changes, is_actual untouched.
-- The destructive half (drop is_actual, swap constraints) is Migration B (007).

CREATE TYPE budget_stage AS ENUM ('proposed', 'adopted', 'actual');

-- Tables converting from is_actual (backfill: true -> actual, false/NULL -> adopted)
ALTER TABLE department_budgets      ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE department_expenditures ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE revenue_by_source       ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';

UPDATE department_budgets      SET stage = 'actual' WHERE is_actual IS TRUE;
UPDATE department_expenditures SET stage = 'actual' WHERE is_actual IS TRUE;
UPDATE revenue_by_source       SET stage = 'actual' WHERE is_actual IS TRUE;

-- Tables gaining stage fresh (all existing rows are adopted-stage data;
-- 07-01 pre-flight audit confirmed zero actual-era stray rows)
ALTER TABLE millage_rates          ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE strategic_area_budgets ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE budget_descriptions    ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
