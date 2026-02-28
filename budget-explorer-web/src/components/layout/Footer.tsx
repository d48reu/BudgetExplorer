const BUDGET_PDF_URL =
  'https://www.miamidade.gov/resources/budget/adopted/fy2025-26/budget-in-brief.pdf'

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-secondary px-4 py-8 md:py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <h3 className="mb-3 font-heading font-semibold text-text-primary">
            Source Data
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>
              <a
                href={BUDGET_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-text-primary"
              >
                FY 2025-26 Budget in Brief (PDF)
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-heading font-semibold text-text-primary">
            Related Resources
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>
              <a
                href="https://www.miamidade.gov/global/management/budget.page"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-text-primary"
              >
                County Budget Office
              </a>
            </li>
            <li>
              <a
                href="https://gis-mdc.opendata.arcgis.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-text-primary"
              >
                Open Data Portal
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-heading font-semibold text-text-primary">
            About
          </h3>
          <p className="text-sm text-text-secondary">
            Built by Abreu Data Works LLC. Budget data sourced from the
            Miami-Dade County FY 2025-26 Adopted Budget.
          </p>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-4 text-center text-xs text-text-muted">
        Not an official Miami-Dade County website. Data is for informational
        purposes only.
      </div>
    </footer>
  )
}
