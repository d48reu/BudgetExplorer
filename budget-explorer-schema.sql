-- ============================================================
-- Miami-Dade County Budget Explorer - Database Schema
-- Abreu Data Works LLC
-- ============================================================

-- Fiscal years table - anchor for all budget data
CREATE TABLE fiscal_years (
    id SERIAL PRIMARY KEY,
    label VARCHAR(20) NOT NULL UNIQUE,        -- 'FY 2025-26'
    start_date DATE NOT NULL,                  -- '2025-10-01'
    end_date DATE NOT NULL,                    -- '2026-09-30'
    total_operating BIGINT,                    -- cents to avoid float issues
    total_capital BIGINT,
    total_budget BIGINT,
    total_employees INTEGER,
    is_adopted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategic areas (the 9 top-level budget categories)
CREATE TABLE strategic_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,         -- 'Public Safety'
    slug VARCHAR(100) NOT NULL UNIQUE,         -- 'public-safety'
    description TEXT,                           -- Plain-English mission statement
    display_order INTEGER NOT NULL,
    color VARCHAR(7)                            -- hex color for charts
);

-- Seed the 9 strategic areas from the Budget in Brief
INSERT INTO strategic_areas (name, slug, description, display_order, color) VALUES
('Policy Formulation', 'policy-formulation', 'To provide effective and efficient resident and business services that respond to community priorities and needs.', 1, '#6B7280'),
('Constitutional Offices', 'constitutional-offices', 'Independently elected constitutional offices mandated by Amendment 10, directly accountable to voters.', 2, '#8B5CF6'),
('Public Safety', 'public-safety', 'To provide a safe and secure community through efficient and effective public safety services using a holistic approach.', 3, '#EF4444'),
('Transportation & Mobility', 'transportation-mobility', 'To provide a safe and resilient transportation system that enhances mobility and connects communities.', 4, '#3B82F6'),
('Recreation & Culture', 'recreation-culture', 'To develop, promote and preserve outstanding cultural, recreational, library, and natural enrichment opportunities.', 5, '#10B981'),
('Neighborhood & Infrastructure', 'neighborhood-infrastructure', 'To protect and preserve natural resources and provide efficient neighborhood and environmental infrastructure services.', 6, '#F59E0B'),
('Health & Society', 'health-society', 'To improve quality of life and promote independence by providing effective social services and affordable housing.', 7, '#EC4899'),
('Economic Development', 'economic-development', 'To foster economic vitality by capitalizing on strengths and supporting investments in key emerging industries.', 8, '#14B8A6'),
('General Government', 'general-government', 'To provide ethical and transparent government that supports excellent public service delivery.', 9, '#6366F1');

-- Departments within strategic areas
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    strategic_area_id INTEGER NOT NULL REFERENCES strategic_areas(id),
    name VARCHAR(200) NOT NULL,                -- 'Fire Rescue'
    slug VARCHAR(200) NOT NULL UNIQUE,         -- 'fire-rescue'
    abbreviation VARCHAR(20),                  -- 'MDFR'
    description TEXT,                           -- AI-generated plain-English summary
    pdf_source_url TEXT,                        -- link to original budget PDF
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed departments from the Budget in Brief
INSERT INTO departments (strategic_area_id, name, slug) VALUES
-- Policy Formulation
(1, 'Office of the Mayor', 'office-of-the-mayor'),
(1, 'Board of County Commissioners', 'board-of-county-commissioners'),
(1, 'County Attorney''s Office', 'county-attorneys-office'),
-- Constitutional Offices
(2, 'Sheriff', 'sheriff'),
(2, 'Supervisor of Elections', 'supervisor-of-elections'),
(2, 'Tax Collector', 'tax-collector'),
(2, 'Property Appraiser', 'property-appraiser'),
(2, 'Clerk of the Court and Comptroller', 'clerk-of-court-comptroller'),
-- Public Safety
(3, 'Corrections and Rehabilitation', 'corrections-rehabilitation'),
(3, 'Fire Rescue', 'fire-rescue'),
(3, 'Emergency Management', 'emergency-management'),
(3, 'Judicial Administration', 'judicial-administration'),
(3, 'Medical Examiner', 'medical-examiner'),
(3, 'Emergency Communication', 'emergency-communication'),
-- Transportation & Mobility
(4, 'Transportation and Public Works', 'transportation-public-works'),
-- Recreation & Culture
(5, 'Cultural Affairs', 'cultural-affairs'),
(5, 'Library', 'library'),
(5, 'Parks, Recreation and Open Spaces', 'parks-recreation-open-spaces'),
-- Neighborhood & Infrastructure
(6, 'Animal Services', 'animal-services'),
(6, 'Environmental Resources Management', 'environmental-resources-management'),
(6, 'Solid Waste Management', 'solid-waste-management'),
(6, 'Water and Sewer', 'water-and-sewer'),
-- Health & Society
(7, 'Community Services Department', 'community-services'),
(7, 'Homeless Trust', 'homeless-trust'),
(7, 'Housing and Community Development', 'housing-community-development'),
-- Economic Development
(8, 'Aviation', 'aviation'),
(8, 'Seaport', 'seaport'),
(8, 'Miami-Dade Economic Advocacy Trust', 'economic-advocacy-trust'),
(8, 'Regulatory and Economic Resources', 'regulatory-economic-resources'),
-- General Government
(9, 'Commission on Ethics and Public Trust', 'ethics-commission'),
(9, 'Communications', 'communications'),
(9, 'Information and Technology', 'information-technology'),
(9, 'Inspector General', 'inspector-general'),
(9, 'Internal Compliance', 'internal-compliance'),
(9, 'Management and Budget', 'management-and-budget'),
(9, 'People and Internal Operations', 'people-internal-operations'),
(9, 'Strategic Procurement', 'strategic-procurement');

-- Revenue sources for the operating budget
CREATE TABLE revenue_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,         -- 'Property Tax'
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER
);

INSERT INTO revenue_sources (name, slug, display_order) VALUES
('Property Tax', 'property-tax', 1),
('Proprietary', 'proprietary', 2),
('Sales Tax', 'sales-tax', 3),
('Federal and State Grants', 'federal-state-grants', 4),
('Miscellaneous', 'miscellaneous', 5),
('Misc. State Revenues', 'misc-state-revenues', 6),
('Gas Tax', 'gas-tax', 7);

-- Revenue by source per fiscal year
CREATE TABLE revenue_by_source (
    id SERIAL PRIMARY KEY,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    revenue_source_id INTEGER NOT NULL REFERENCES revenue_sources(id),
    amount BIGINT NOT NULL,                    -- in cents
    percentage DECIMAL(5,2),
    is_actual BOOLEAN DEFAULT FALSE,           -- true = actual, false = budgeted
    UNIQUE(fiscal_year_id, revenue_source_id, is_actual)
);

-- Expenditure categories (the "Your Dollar at Work" breakdown)
CREATE TABLE expenditure_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER
);

INSERT INTO expenditure_categories (name, slug, description, display_order) VALUES
('Salary', 'salary', 'Total compensation costs associated with County employees.', 1),
('Fringes', 'fringes', 'Employee federal taxes, pension, health insurance, and other expenses.', 2),
('Contractual Services', 'contractual-services', 'Work provided by outside contractors.', 3),
('Other Operating Costs', 'other-operating-costs', 'Leases of rental space, office supplies, travel, and other general goods and services.', 4),
('Charges for County Services', 'charges-county-services', 'Services provided by internal support functions to County departments.', 5),
('Grants to Outside Organizations', 'grants-outside-orgs', 'Funding provided to community-based organizations and other not-for-profit entities.', 6),
('Capital', 'capital', 'Purchase of office related equipment, furniture, and other assets.', 7),
('Court Costs', 'court-costs', 'Fees for accessing the court system and related services.', 8),
('Interagency Transfers', 'interagency-transfers', 'Transfers between departments for services provided.', 9);

-- Department budgets per fiscal year (the core data table)
CREATE TABLE department_budgets (
    id SERIAL PRIMARY KEY,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    department_id INTEGER NOT NULL REFERENCES departments(id),
    operating_budget BIGINT,                   -- total operating in cents
    capital_budget BIGINT,                     -- total capital in cents
    total_budget BIGINT,                       -- operating + capital
    employee_count INTEGER,
    is_actual BOOLEAN DEFAULT FALSE,
    UNIQUE(fiscal_year_id, department_id, is_actual)
);

-- Department expenditures by category per fiscal year
CREATE TABLE department_expenditures (
    id SERIAL PRIMARY KEY,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    department_id INTEGER NOT NULL REFERENCES departments(id),
    expenditure_category_id INTEGER NOT NULL REFERENCES expenditure_categories(id),
    amount BIGINT NOT NULL,                    -- in cents
    is_actual BOOLEAN DEFAULT FALSE,
    UNIQUE(fiscal_year_id, department_id, expenditure_category_id, is_actual)
);

-- Strategic area operating budgets per fiscal year
CREATE TABLE strategic_area_budgets (
    id SERIAL PRIMARY KEY,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    strategic_area_id INTEGER NOT NULL REFERENCES strategic_areas(id),
    operating_budget BIGINT,
    capital_budget BIGINT,
    cents_per_dollar INTEGER,                  -- e.g., 19 for "19 cents of every dollar"
    UNIQUE(fiscal_year_id, strategic_area_id)
);

-- Property tax millage rates (for the "what does my tax dollar buy" calculator)
CREATE TABLE millage_rates (
    id SERIAL PRIMARY KEY,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    authority VARCHAR(100) NOT NULL,           -- 'Countywide Operating', 'UMSA Operating', etc.
    millage_rate DECIMAL(8,4) NOT NULL,
    is_county BOOLEAN DEFAULT TRUE,            -- false = School Board, Children's Trust, etc.
    display_order INTEGER,
    UNIQUE(fiscal_year_id, authority)
);

-- Seed FY 2025-26 millage rates from the Budget in Brief
-- (fiscal_year_id = 1 assumes FY 2025-26 is inserted first)
-- INSERT these after creating the fiscal year record

-- AI-generated plain-English descriptions (your encyclopedia layer)
CREATE TABLE budget_descriptions (
    id SERIAL PRIMARY KEY,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    entity_type VARCHAR(50) NOT NULL,          -- 'department', 'strategic_area', 'line_item'
    entity_id INTEGER NOT NULL,
    summary TEXT NOT NULL,                      -- 1-2 sentence summary
    detailed_description TEXT,                  -- full plain-English breakdown
    key_changes TEXT,                           -- what changed from prior year
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_version VARCHAR(50)                  -- 'claude-sonnet-4-5-20250929'
);

-- Capital programs (529 programs in FY 2025-26)
CREATE TABLE capital_programs (
    id SERIAL PRIMARY KEY,
    fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
    department_id INTEGER NOT NULL REFERENCES departments(id),
    strategic_area_id INTEGER NOT NULL REFERENCES strategic_areas(id),
    program_name VARCHAR(500) NOT NULL,
    adopted_amount BIGINT,
    multi_year_total BIGINT,                   -- total across all years
    description TEXT
);

-- Online Checkbook disbursements (actual spending data)
CREATE TABLE disbursements (
    id SERIAL PRIMARY KEY,
    payee_name VARCHAR(500),
    payment_date DATE NOT NULL,
    amount BIGINT NOT NULL,                    -- in cents
    disbursement_number VARCHAR(50),
    department_name VARCHAR(200),              -- as it appears in checkbook
    department_id INTEGER REFERENCES departments(id), -- mapped to our departments
    fund_name VARCHAR(200),
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_dept_budgets_fy ON department_budgets(fiscal_year_id);
CREATE INDEX idx_dept_budgets_dept ON department_budgets(department_id);
CREATE INDEX idx_dept_expenditures_fy ON department_expenditures(fiscal_year_id);
CREATE INDEX idx_revenue_by_source_fy ON revenue_by_source(fiscal_year_id);
CREATE INDEX idx_disbursements_date ON disbursements(payment_date);
CREATE INDEX idx_disbursements_dept ON disbursements(department_id);
CREATE INDEX idx_disbursements_payee ON disbursements(payee_name);
CREATE INDEX idx_capital_programs_fy ON capital_programs(fiscal_year_id);
CREATE INDEX idx_budget_descriptions_entity ON budget_descriptions(entity_type, entity_id);

-- Useful views

-- Budget by strategic area with department rollup
CREATE VIEW v_strategic_area_summary AS
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
    AND db.department_id IN (SELECT id FROM departments WHERE strategic_area_id = sa.id)
GROUP BY fy.label, sa.name, sa.slug, sa.color, sab.operating_budget, sab.capital_budget, sab.cents_per_dollar;

-- Year-over-year department comparison
CREATE VIEW v_department_yoy AS
SELECT
    d.name AS department,
    d.slug,
    sa.name AS strategic_area,
    fy.label AS fiscal_year,
    db.operating_budget,
    db.capital_budget,
    db.employee_count,
    LAG(db.operating_budget) OVER (PARTITION BY d.id ORDER BY fy.start_date) AS prior_operating,
    LAG(db.employee_count) OVER (PARTITION BY d.id ORDER BY fy.start_date) AS prior_employees
FROM department_budgets db
JOIN departments d ON d.id = db.department_id
JOIN strategic_areas sa ON sa.id = d.strategic_area_id
JOIN fiscal_years fy ON fy.id = db.fiscal_year_id
WHERE db.is_actual = FALSE
ORDER BY d.name, fy.start_date;
