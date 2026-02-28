-- ============================================================
-- Migration 002: Department Aliases
-- Miami-Dade County Budget Explorer
--
-- Creates the department_aliases table for cross-year mapping.
-- Departments and strategic areas change significantly across
-- fiscal years (renamed, merged, reorganized). This table maps
-- historical names to current department IDs.
-- ============================================================

CREATE TABLE IF NOT EXISTS department_aliases (
    id SERIAL PRIMARY KEY,
    current_department_id INTEGER NOT NULL REFERENCES departments(id),
    historical_name VARCHAR(200) NOT NULL,
    fiscal_year_start VARCHAR(20),
    fiscal_year_end VARCHAR(20),
    notes TEXT,
    UNIQUE(historical_name, fiscal_year_start)
);

-- Seed known aliases for the 2025 constitutional offices reorganization.
-- In January 2025, Miami-Dade established 5 independent constitutional
-- offices that were previously county departments.
INSERT INTO department_aliases (current_department_id, historical_name, fiscal_year_start, fiscal_year_end, notes) VALUES
(
    (SELECT id FROM departments WHERE slug = 'sheriff'),
    'Miami-Dade Police Department',
    'FY 2021-22',
    'FY 2024-25',
    'Became independent Sheriff office Jan 2025'
),
(
    (SELECT id FROM departments WHERE slug = 'supervisor-of-elections'),
    'Elections Department',
    'FY 2021-22',
    'FY 2024-25',
    'Became independent constitutional office Jan 2025'
),
(
    (SELECT id FROM departments WHERE slug = 'tax-collector'),
    'Tax Collector Division',
    'FY 2021-22',
    'FY 2024-25',
    'Became independent constitutional office Jan 2025'
);
