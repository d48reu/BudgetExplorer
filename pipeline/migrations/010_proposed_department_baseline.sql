-- ============================================================
-- Migration 010: Proposed Department Comparison Baseline
--
-- Appendix A restates the adopted operating budget and positions using the
-- proposal's seven-priority organization. Keeping that baseline on proposed
-- fact rows enables honest department comparisons without pretending the
-- adopted nine-area taxonomy maps directly to the proposed priorities.
-- ============================================================

ALTER TABLE department_budgets
    ADD COLUMN baseline_operating_budget BIGINT
        CHECK (
            baseline_operating_budget IS NULL
            OR baseline_operating_budget >= 0
        ),
    ADD COLUMN baseline_employee_count INTEGER
        CHECK (
            baseline_employee_count IS NULL
            OR baseline_employee_count >= 0
        );
