-- Internal staff workspace for source review, meeting preparation, and follow-up.
-- This schema is isolated from the public budget facts and search index.

CREATE TABLE IF NOT EXISTS staff_issue_briefs (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(250) NOT NULL,
    summary TEXT NOT NULL,
    decision_needed TEXT NOT NULL,
    office_posture TEXT NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('active', 'monitoring', 'closed')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    decision_date DATE,
    public_release_status VARCHAR(30) NOT NULL DEFAULT 'internal-only'
        CHECK (public_release_status IN ('internal-only', 'approved', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_issue_briefs_status
    ON staff_issue_briefs (status);
CREATE INDEX IF NOT EXISTS idx_staff_issue_briefs_decision_date
    ON staff_issue_briefs (decision_date);

CREATE TABLE IF NOT EXISTS staff_claims (
    id SERIAL PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES staff_issue_briefs(id) ON DELETE CASCADE,
    display_value VARCHAR(80),
    claim_text TEXT NOT NULL,
    source_name VARCHAR(200) NOT NULL,
    source_url TEXT,
    source_locator VARCHAR(160),
    verification_status VARCHAR(30) NOT NULL
        CHECK (verification_status IN ('verified', 'reported', 'pending', 'conflicting')),
    scope_note TEXT,
    staff_note TEXT,
    assigned_to VARCHAR(80),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_claims_brief_order
    ON staff_claims (brief_id, display_order);
CREATE INDEX IF NOT EXISTS idx_staff_claims_status
    ON staff_claims (verification_status);

CREATE TABLE IF NOT EXISTS staff_tasks (
    id SERIAL PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES staff_issue_briefs(id) ON DELETE CASCADE,
    task_text TEXT NOT NULL,
    owner_role VARCHAR(80) NOT NULL,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_tasks_brief_status_due
    ON staff_tasks (brief_id, status, due_date);

CREATE TABLE IF NOT EXISTS staff_activity (
    id SERIAL PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES staff_issue_briefs(id) ON DELETE CASCADE,
    action VARCHAR(80) NOT NULL,
    actor_name VARCHAR(100) NOT NULL,
    actor_role VARCHAR(80) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_activity_brief_created
    ON staff_activity (brief_id, created_at DESC);

INSERT INTO staff_issue_briefs (
    slug,
    title,
    summary,
    decision_needed,
    office_posture,
    status,
    priority,
    decision_date,
    public_release_status
)
VALUES (
    'early-morning-metrobus-service',
    'Early-morning Metrobus service',
    'The FY 2026-27 proposal closes part of the regional transportation funding gap through service reductions. Transit Alliance is asking the County to restore $12.4 million for service before 6 a.m.',
    'Decide whether to support restoring first-bus service and which recurring funding approach warrants further analysis before the final budget hearing.',
    'Protect access for early-shift workers while requiring route-level ridership, cost-allocation, and recurring-funding evidence before relying on district-specific claims.',
    'active',
    'high',
    '2026-09-17',
    'internal-only'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO staff_claims (
    brief_id,
    display_value,
    claim_text,
    source_name,
    source_url,
    source_locator,
    verification_status,
    scope_note,
    staff_note,
    assigned_to,
    display_order
)
SELECT brief.id, claim.display_value, claim.claim_text, claim.source_name,
       claim.source_url, claim.source_locator, claim.verification_status,
       claim.scope_note, claim.staff_note, claim.assigned_to, claim.display_order
FROM staff_issue_briefs brief
CROSS JOIN (VALUES
    ('$96M', 'The regional transportation system required approximately $96 million more than the prior-year adopted level.', 'Miami-Dade County FY 2026-27 Proposed Budget', 'https://www.miamidade.gov/resources/budget/fy-26-27/proposed/volume-1-bookmarks.pdf', 'Volume 1, p. 102', 'verified', 'Countywide regional transportation funding need.', NULL, NULL, 10),
    ('+$65.3M', 'Countywide General Fund support for regional transportation rises from $270.655 million to $335.979 million.', 'Miami-Dade County FY 2026-27 Proposed Budget', 'https://www.miamidade.gov/resources/budget/fy-26-27/proposed/volume-1-bookmarks.pdf', 'Volume 1, pp. 102 and 106', 'verified', 'The County narrative rounds this increase to $66 million.', NULL, NULL, 20),
    ('$30M', 'The remaining funding gap is addressed through service-related reductions.', 'Miami-Dade County FY 2026-27 Proposed Budget', 'https://www.miamidade.gov/resources/budget/fy-26-27/proposed/volume-1-bookmarks.pdf', 'Volume 1, pp. 102-103', 'verified', 'Countywide service-reduction package; not limited to early-morning routes.', NULL, NULL, 30),
    ('$12.4M', 'Restoring early-morning service would cost $12.4 million.', 'Transit Alliance Miami', 'https://www.transitalliance.miami/take-action/miami-dade-county-transit-budget-fy-2026-2027', 'Save the First Bus campaign', 'reported', 'Stakeholder estimate pending the underlying DTPW calculation.', 'Confirm whether the estimate covers all 47 routes or only County-operated service.', 'Legislative team', 40),
    ('47 routes', 'Forty-seven routes, including contracted routes, would lose service before 5:59 a.m.', 'Transit Alliance Miami', 'https://www.transitalliance.miami/take-action/miami-dade-county-transit-budget-fy-2026-2027', 'Save the First Bus campaign', 'reported', 'Includes contracted routes; distinguish reduced spans from full route eliminations.', NULL, 'Legislative team', 50),
    ('$4.20M', 'The restoration amount attributed to routes serving District 7 is $4,203,663.', 'Transit Alliance Miami', 'https://www.transitalliance.miami/take-action/miami-dade-county-transit-budget-fy-2026-2027', 'District 7 infographic', 'pending', 'It is not yet clear whether route costs overlap across commission districts.', 'Request the calculation and source workbook.', 'Legislative team', 60),
    ('2,128', 'Affected routes serving District 7 carry 2,128 riders on an average weekday.', 'Transit Alliance Miami', 'https://www.transitalliance.miami/take-action/miami-dade-county-transit-budget-fy-2026-2027', 'District 7 infographic', 'pending', 'Clarify whether this is early-morning boardings, all-day route ridership, and whether it is systemwide or within District 7.', 'Ask for the trip-level ridership definition.', 'Legislative team', 70),
    ('+$37.1M', 'DTPW operating funding rises from $904.214 million to $941.334 million while authorized positions decline from 4,241 to 3,938.', 'Miami-Dade County FY 2026-27 Proposed Budget', 'https://www.miamidade.gov/resources/budget/fy-26-27/proposed/volume-1-bookmarks.pdf', 'Volume 1, Appendix A, p. 114', 'verified', 'Department-wide figures include public works and organizational changes; do not attribute all 303 positions to bus service.', NULL, NULL, 80)
) AS claim(
    display_value,
    claim_text,
    source_name,
    source_url,
    source_locator,
    verification_status,
    scope_note,
    staff_note,
    assigned_to,
    display_order
)
WHERE brief.slug = 'early-morning-metrobus-service'
  AND NOT EXISTS (
      SELECT 1 FROM staff_claims existing WHERE existing.brief_id = brief.id
  );

INSERT INTO staff_tasks (brief_id, task_text, owner_role, due_date, status)
SELECT brief.id, task.task_text, task.owner_role, task.due_date::date, 'open'
FROM staff_issue_briefs brief
CROSS JOIN (VALUES
    ('Obtain the DTPW workbook underlying the $4.2 million District 7 estimate.', 'Legislative team', '2026-09-09'),
    ('Confirm whether 2,128 measures the trips being cut or all-day route ridership.', 'Legislative team', '2026-09-09'),
    ('Identify recurring funding options for a $12.4 million restoration.', 'Policy staff', '2026-09-11'),
    ('Prepare the Commissioner decision brief for the final budget hearing.', 'Chief of Staff', '2026-09-14')
) AS task(task_text, owner_role, due_date)
WHERE brief.slug = 'early-morning-metrobus-service'
  AND NOT EXISTS (
      SELECT 1 FROM staff_tasks existing WHERE existing.brief_id = brief.id
  );

INSERT INTO staff_activity (brief_id, action, actor_name, actor_role, details)
SELECT id, 'brief-created', 'Budget Explorer', 'System',
       'Created the first internal issue brief from audited County data and reported stakeholder claims.'
FROM staff_issue_briefs brief
WHERE slug = 'early-morning-metrobus-service'
  AND NOT EXISTS (
      SELECT 1 FROM staff_activity existing WHERE existing.brief_id = brief.id
  );
