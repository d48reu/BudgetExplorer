-- ============================================================
-- Migration 003: Appendix C + J Integration
-- Miami-Dade County Budget Explorer
-- Abreu Data Works LLC
--
-- Adds strategic_area_id to department_budgets to support
-- departments split across multiple strategic areas.
-- Inserts new departments from Appendix C and J.
-- Updates views to use department_budgets.strategic_area_id.
-- ============================================================

-- 1. Add strategic_area_id column to department_budgets
ALTER TABLE department_budgets
    ADD COLUMN IF NOT EXISTS strategic_area_id INTEGER REFERENCES strategic_areas(id);

-- 2. Drop old unique constraint, create new one that includes strategic_area_id
ALTER TABLE department_budgets
    DROP CONSTRAINT IF EXISTS department_budgets_fiscal_year_id_department_id_is_actual_key;

-- Create new constraint (NULLs in strategic_area_id are treated as distinct by PG)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'department_budgets_fy_dept_area_actual_key'
    ) THEN
        ALTER TABLE department_budgets
            ADD CONSTRAINT department_budgets_fy_dept_area_actual_key
            UNIQUE(fiscal_year_id, department_id, strategic_area_id, is_actual);
    END IF;
END $$;

-- 3. Add index on strategic_area_id
CREATE INDEX IF NOT EXISTS idx_dept_budgets_area ON department_budgets(strategic_area_id);

-- 4. Insert new departments not in current seed
INSERT INTO departments (strategic_area_id, name, slug) VALUES
-- Public Safety
(3, 'Legal Aid', 'legal-aid'),
(3, 'Law Library', 'law-library'),
(3, 'Juvenile Services', 'juvenile-services'),
(3, 'Independent Civilian Panel', 'independent-civilian-panel'),
-- Transportation & Mobility
(4, 'Office of the Citizens'' Independent Transportation Trust', 'citizens-independent-transportation-trust'),
-- Recreation & Culture
(5, 'Tourist Taxes', 'tourist-taxes'),
(5, 'Adrienne Arsht Center for the Performing Arts Trust', 'adrienne-arsht-center'),
(5, 'Perez Art Museum Miami', 'perez-art-museum-miami'),
(5, 'HistoryMiami', 'historymiami'),
(5, 'Vizcaya Museum and Gardens', 'vizcaya-museum-gardens'),
-- Health & Society
(7, 'Jackson Health System', 'jackson-health-system'),
-- General Government
(9, 'Non-Departmental', 'non-departmental'),
(9, 'General Government Improvement Fund', 'general-government-improvement-fund'),
(9, 'Communications and Customer Experience', 'communications-customer-experience'),
(9, 'Finance', 'finance'),
(9, 'Human Resources', 'human-resources'),
(9, 'Internal Services', 'internal-services'),
(9, 'Audit and Management Services', 'audit-management-services')
ON CONFLICT (slug) DO NOTHING;

-- 5. Insert department aliases for name resolution
INSERT INTO department_aliases (current_department_id, historical_name, fiscal_year_start, notes) VALUES
(
    (SELECT id FROM departments WHERE slug = 'sheriff'),
    'Sheriff''s Office',
    'FY 2021-22',
    'Appendix C uses Sheriff''s Office name'
),
(
    (SELECT id FROM departments WHERE slug = 'community-services'),
    'Community Services',
    'FY 2021-22',
    'Appendix C omits Department suffix'
),
(
    (SELECT id FROM departments WHERE slug = 'information-technology'),
    'Communications, Information and Technology',
    'FY 2025-26',
    'FY 25-26 merged department maps to Information and Technology'
),
(
    (SELECT id FROM departments WHERE slug = 'water-and-sewer'),
    'Water and Sewer Department',
    'FY 2021-22',
    'Sometimes has Department suffix in PDFs'
),
(
    (SELECT id FROM departments WHERE slug = 'library'),
    'Library Department',
    'FY 2021-22',
    'Appendix J uses Library Department'
)
ON CONFLICT (historical_name, fiscal_year_start) DO NOTHING;

-- 6. Update views to use department_budgets.strategic_area_id
CREATE OR REPLACE VIEW v_strategic_area_summary AS
SELECT
    fy.label AS fiscal_year,
    sa.name AS strategic_area,
    sa.slug,
    sa.color,
    sab.operating_budget,
    sab.capital_budget,
    sab.cents_per_dollar,
    COUNT(DISTINCT db.department_id) AS department_count,
    SUM(db.employee_count) AS total_employees
FROM strategic_area_budgets sab
JOIN fiscal_years fy ON fy.id = sab.fiscal_year_id
JOIN strategic_areas sa ON sa.id = sab.strategic_area_id
LEFT JOIN department_budgets db ON db.fiscal_year_id = sab.fiscal_year_id
    AND db.strategic_area_id = sa.id
GROUP BY fy.label, sa.name, sa.slug, sa.color,
         sab.operating_budget, sab.capital_budget, sab.cents_per_dollar;

-- YoY view: partition by (dept, area) for multi-area departments
CREATE OR REPLACE VIEW v_department_yoy AS
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
WHERE db.is_actual = FALSE
ORDER BY d.name, fy.start_date;
