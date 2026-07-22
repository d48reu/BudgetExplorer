import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ComparisonCard } from '@/components/proposed/ComparisonCard'
import { PriorityBudgetTable } from '@/components/proposed/PriorityBudgetTable'
import { Card } from '@/components/ui/Card'
import {
  formatDollarsAbbreviated,
  formatDollarsFull,
} from '@/lib/format'
import { getProposedBudgetOverview } from '@/lib/db/queries'

export const metadata: Metadata = {
  title: 'FY 2026–27 Proposed Budget',
  description:
    'Explore the Miami-Dade County FY 2026–27 proposed budget and compare it with the current adopted budget.',
}

export const revalidate = 86400

function formatReleaseDate(value: string | null) {
  if (!value) return 'Release date unavailable'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

export default async function ProposedBudgetPage() {
  const overview = await getProposedBudgetOverview()
  if (!overview) notFound()

  const { proposed, adopted, priorities, departmentCount, sources } = overview
  const employeeDifference =
    adopted?.employees != null && proposed.employees != null
      ? proposed.employees - adopted.employees
      : null
  const millageChange =
    adopted?.countyMillage != null && proposed.countyMillage != null
      ? proposed.countyMillage - adopted.countyMillage
      : null

  const sourceLinks = [
    ['Budget in Brief', sources.budgetInBrief],
    ['Volume 1: Operating Budget', sources.volume1],
    ['Volume 2: Departments', sources.volume2],
    ['Volume 3: Capital Budget', sources.volume3],
  ].filter((source): source is [string, string] => Boolean(source[1]))

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Proposed budget' }]} />

      <section className="mt-6 overflow-hidden rounded-xl border border-amber-300 bg-amber-50">
        <div className="border-b border-amber-300 px-5 py-3 sm:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-900">
            Proposed — not adopted
          </p>
        </div>
        <div className="px-5 py-7 sm:px-8 sm:py-10">
          <p className="text-sm font-medium text-text-secondary">
            Miami-Dade County {proposed.fiscalYear}
          </p>
          <h1 className="mt-2 max-w-3xl font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-5xl">
            {formatDollarsAbbreviated(proposed.total)} proposed budget
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary sm:text-lg">
            Released {formatReleaseDate(proposed.asOfDate)}. These are recommended
            figures and may change through commission review, public hearings, and
            final adoption.
          </p>
        </div>
      </section>

      <section aria-labelledby="comparison-heading" className="mt-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-mdc-blue">
            Proposed vs. current adopted
          </p>
          <h2 id="comparison-heading" className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
            What changes at the headline level
          </h2>
          <p className="mt-3 text-text-secondary">
            The comparison uses the published {adopted?.fiscalYear ?? 'current'} adopted
            release as the baseline. Increases and decreases describe funding levels,
            not whether a change is good or bad.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ComparisonCard
            label="Total budget"
            proposed={proposed.total}
            adopted={adopted?.total ?? null}
            note={`from ${adopted ? formatDollarsAbbreviated(adopted.total) : 'adopted budget'}`}
          />
          <ComparisonCard
            label="Net operating budget"
            proposed={proposed.netOperating}
            adopted={adopted?.netOperating ?? null}
            note={`from ${adopted ? formatDollarsAbbreviated(adopted.netOperating) : 'adopted budget'}`}
          />
          <ComparisonCard
            label="Capital budget"
            proposed={proposed.capital}
            adopted={adopted?.capital ?? null}
            note={`from ${adopted ? formatDollarsAbbreviated(adopted.capital) : 'adopted budget'}`}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-sm font-medium text-text-secondary">Positions</p>
            <p className="mt-2 font-heading text-2xl font-bold">
              {proposed.employees?.toLocaleString('en-US') ?? '—'}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {employeeDifference == null
                ? 'Adopted comparison unavailable'
                : `${Math.abs(employeeDifference).toLocaleString('en-US')} ${employeeDifference < 0 ? 'fewer' : 'more'} than the published adopted release`}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-text-secondary">County millage</p>
            <p className="mt-2 font-heading text-2xl font-bold">
              {proposed.countyMillage?.toFixed(4) ?? '—'} mills
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {millageChange == null
                ? 'Adopted comparison unavailable'
                : `${millageChange > 0 ? '+' : ''}${millageChange.toFixed(4)} from the current adopted rate`}
            </p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="reconciliation-heading" className="mt-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.65fr)] lg:items-start">
          <div>
            <h2 id="reconciliation-heading" className="font-heading text-2xl font-bold sm:text-3xl">
              Why two operating totals appear
            </h2>
            <p className="mt-3 max-w-3xl text-text-secondary">
              Priority and department tables are shown gross, before county agencies’
              internal payments are removed. The headline total is net, preventing the
              same dollars from being counted twice.
            </p>
            <dl className="mt-6 overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <dt className="font-medium">Gross operating budget</dt>
                <dd className="font-heading text-lg font-bold">{formatDollarsFull(proposed.grossOperating)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-secondary px-5 py-4 text-text-secondary">
                <dt>Less interagency transfers</dt>
                <dd className="font-semibold">−{formatDollarsFull(proposed.interagencyTransfers)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-4 text-mdc-blue">
                <dt className="font-semibold">Net operating budget</dt>
                <dd className="font-heading text-xl font-bold">{formatDollarsFull(proposed.netOperating)}</dd>
              </div>
            </dl>
          </div>
          <Card className="bg-surface-secondary">
            <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Scope
            </p>
            <dl className="mt-4 space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-text-secondary">Priorities</dt>
                <dd className="font-heading text-xl font-bold">{priorities.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-text-secondary">Departments and offices</dt>
                <dd className="font-heading text-xl font-bold">{departmentCount}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-text-secondary">Capital program</dt>
                <dd className="font-heading text-xl font-bold">{formatDollarsAbbreviated(proposed.capital)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </section>

      <section aria-labelledby="priorities-heading" className="mt-12">
        <div className="max-w-3xl">
          <h2 id="priorities-heading" className="font-heading text-2xl font-bold sm:text-3xl">
            Funding by proposed priority
          </h2>
          <p className="mt-3 text-text-secondary">
            Operating allocations below are gross of interagency transfers. Capital
            figures show the proposed multi-year capital program associated with each
            priority.
          </p>
        </div>
        <div className="mt-6">
          <PriorityBudgetTable priorities={priorities} grossOperating={proposed.grossOperating} />
        </div>
      </section>

      <section aria-labelledby="sources-heading" className="my-12 rounded-lg border border-border bg-surface-secondary p-5 sm:p-8">
        <h2 id="sources-heading" className="font-heading text-xl font-bold">Official source documents</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
          Figures were extracted from Miami-Dade County’s published proposed budget
          documents and reconciled to their appendix totals. Links open the official PDFs.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {sourceLinks.map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-mdc-blue underline underline-offset-4 hover:text-blue-800"
              >
                {label} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-text-muted">
          This explorer is informational and is not an official Miami-Dade County website.
          For the adopted budget, return to the <Link href="/explorer" className="underline hover:text-text-primary">current budget explorer</Link>.
        </p>
      </section>
    </div>
  )
}
