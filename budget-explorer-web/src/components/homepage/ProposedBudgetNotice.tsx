import Link from 'next/link'

export function ProposedBudgetNotice() {
  return (
    <aside
      aria-label="Proposed budget available"
      className="mx-auto mb-8 max-w-4xl px-4"
    >
      <div className="flex flex-col gap-4 rounded-lg border border-mdc-blue/30 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading font-semibold text-text-primary">
            FY 2026–27 proposed budget is available
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Review the proposal and compare it with the current adopted budget.
          </p>
        </div>
        <Link
          href="/proposed"
          className="shrink-0 text-sm font-semibold text-mdc-blue underline underline-offset-4 hover:text-blue-800"
        >
          Explore the proposal <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  )
}
