import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BudgetComparisonTable } from '@/components/proposed/BudgetComparisonTable'
import { DepartmentChangePlot } from '@/components/proposed/DepartmentChangePlot'
import { PriorityBudgetTable } from '@/components/proposed/PriorityBudgetTable'
import { BudgetAllocationRibbon } from '@/components/releases/BudgetAllocationRibbon'
import { BudgetWaterfall } from '@/components/releases/BudgetWaterfall'
import { ReleaseFacts } from '@/components/releases/ReleaseFacts'
import { ReleaseMasthead } from '@/components/releases/ReleaseMasthead'
import { ReleaseSwitcher } from '@/components/releases/ReleaseSwitcher'
import { ReportSection } from '@/components/releases/ReportSection'
import { getProposedBudgetOverview } from '@/lib/db/queries'

export const metadata: Metadata = {
  title: 'FY 2026–27 Proposed Budget',
  description:
    'Explore the Miami-Dade County FY 2026–27 proposed budget and compare it with the current adopted budget.',
}

export const revalidate = 86400

function formatReleaseDate(value: string | null) {
  if (!value) return 'release date unavailable'
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

  const {
    proposed,
    adopted,
    priorities,
    departmentChanges,
    departmentCount,
    sources,
  } = overview
  const employeeDifference =
    adopted?.employees != null && proposed.employees != null
      ? proposed.employees - adopted.employees
      : null
  const millageChange =
    adopted?.countyMillage != null && proposed.countyMillage != null
      ? proposed.countyMillage - adopted.countyMillage
      : null

  const comparisons = [
    {
      label: 'Total budget',
      description: 'Net operating plus the multi-year capital program.',
      proposed: proposed.total,
      adopted: adopted?.total ?? null,
    },
    {
      label: 'Net operating',
      description: 'Annual operations after internal county transfers are removed.',
      proposed: proposed.netOperating,
      adopted: adopted?.netOperating ?? null,
    },
    {
      label: 'Capital program',
      description: 'Planned investment in buildings, infrastructure, and major systems.',
      proposed: proposed.capital,
      adopted: adopted?.capital ?? null,
    },
  ]

  const allocationItems = priorities.map((priority) => ({
    id: priority.id,
    name: priority.name,
    slug: priority.slug,
    color: priority.color,
    centsPerDollar: priority.centsPerDollar,
    operatingBudget: priority.operatingBudget,
  }))

  const sourceLinks = [
    ['Budget in Brief', sources.budgetInBrief],
    ['Volume 1 — Operating Budget', sources.volume1],
    ['Volume 2 — Departments', sources.volume2],
    ['Volume 3 — Capital Budget', sources.volume3],
  ].filter((source): source is [string, string] => Boolean(source[1]))

  const facts = [
    {
      label: 'Priorities',
      value: priorities.length.toLocaleString('en-US'),
      note: 'Proposed organization',
    },
    {
      label: 'Departments',
      value: departmentCount.toLocaleString('en-US'),
      note: 'With proposed budget facts',
    },
    {
      label: 'Funded positions',
      value: (proposed.employees ?? 0).toLocaleString('en-US'),
      note:
        employeeDifference == null
          ? 'Adopted comparison unavailable'
          : `${Math.abs(employeeDifference)} ${employeeDifference < 0 ? 'fewer' : 'more'} than adopted`,
    },
    {
      label: 'County millage',
      value: proposed.countyMillage?.toFixed(4) ?? '—',
      note:
        millageChange == null
          ? 'Adopted comparison unavailable'
          : `${millageChange > 0 ? '+' : ''}${millageChange.toFixed(4)} from adopted`,
    },
  ]

  return (
    <div className="bg-[#F5F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ReleaseSwitcher activeStage="proposed" />
        <div className="mt-5">
          <ReleaseMasthead
            stage="proposed"
            fiscalYear={proposed.fiscalYear}
            totalBudget={proposed.total}
            title="Proposed county budget"
            description={`Released ${formatReleaseDate(proposed.asOfDate)} for public and commission review. Figures may change before final adoption.`}
            context={`${priorities.length} priorities · ${departmentCount} departments`}
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Budget math"
          title="How the proposed total is built"
          description="The proposal uses the same accounting sequence as the adopted release: gross operating costs, less internal transfers, plus the capital program."
        >
          <BudgetWaterfall release={proposed} />
        </ReportSection>

        <ReportSection
          number="02"
          label="Allocation"
          title="Where each proposed operating dollar goes"
          description="The proposal reorganizes services under seven priorities. This is a structural change from the nine strategic areas in the current adopted budget, so the two taxonomies are presented separately."
        >
          <BudgetAllocationRibbon items={allocationItems} />
        </ReportSection>

        <ReportSection
          number="03"
          label="Comparison"
          title="The proposed change at the topline"
          description={`Headline totals compare the proposal with the published ${adopted?.fiscalYear ?? 'current'} adopted release. Blue denotes a funding increase; orange denotes a decrease.`}
        >
          <BudgetComparisonTable rows={comparisons} />
        </ReportSection>

        <ReportSection
          number="04"
          label="Departments"
          title="Where operating budgets move most"
          description="Department comparisons use Appendix A’s restated adopted baseline, which applies the proposal’s own department and priority structure to both years."
        >
          <DepartmentChangePlot changes={departmentChanges} />
        </ReportSection>

        <ReportSection
          number="05"
          label="Priority record"
          title="Operating and capital by priority"
          description="Operating allocations are gross of internal transfers. Capital figures show the proposed multi-year program associated with each priority."
        >
          <PriorityBudgetTable
            priorities={priorities}
            grossOperating={proposed.grossOperating}
          />
        </ReportSection>

        <ReportSection
          number="06"
          label="Sources"
          title="The official proposal record"
          description="Figures were extracted from the County’s published proposal and reconciled to its appendix totals. Each link opens an official PDF."
        >
          <ol className="grid border-t-2 border-text-primary md:grid-cols-2 md:gap-x-10">
            {sourceLinks.map(([label, href], index) => (
              <li key={href} className="border-b border-border-strong">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 font-heading font-semibold text-text-primary transition-colors hover:text-mdc-blue"
                >
                  <span className="text-xs tabular-nums text-text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{label}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ol>
        </ReportSection>
      </div>

      <div className="bg-text-primary text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="max-w-2xl text-white/70">
            Informational only. This explorer is not an official Miami-Dade County website.
          </p>
          <Link href="/" className="font-bold underline decoration-mdc-orange decoration-2 underline-offset-4 hover:text-white/75">
            Return to the adopted budget <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
