-- ============================================================
-- Migration 009: Release Operating Reconciliation
--
-- Department and priority facts are gross of interagency transfers, while
-- the headline operating release total is net. Store both sides explicitly.
-- ============================================================

ALTER TABLE budget_releases
    ADD COLUMN gross_operating BIGINT
        CHECK (gross_operating IS NULL OR gross_operating >= 0),
    ADD COLUMN interagency_transfers BIGINT
        CHECK (interagency_transfers IS NULL OR interagency_transfers >= 0);

UPDATE budget_releases br
SET gross_operating = totals.gross_operating,
    interagency_transfers = totals.gross_operating - br.total_operating
FROM (
    SELECT fiscal_year_id, stage, SUM(COALESCE(operating_budget, 0)) AS gross_operating
    FROM department_budgets
    GROUP BY fiscal_year_id, stage
) totals
WHERE totals.fiscal_year_id = br.fiscal_year_id
  AND totals.stage = br.stage
  AND br.total_operating IS NOT NULL
  AND totals.gross_operating >= br.total_operating;
