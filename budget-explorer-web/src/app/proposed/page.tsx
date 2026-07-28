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
    'Miami-Dade County’s FY 2026–27 proposed budget, with department changes and a comparison to the current adopted budget.',
}

export const revalidate = 86400

function formatReleaseDate(value: string | null) {
  if (!value) return null
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
      note: 'Used in the proposal',
    },
    {
      label: 'Departments',
      value: departmentCount.toLocaleString('en-US'),
      note: 'With proposed budget data',
    },
    {
      label: 'Funded positions',
      value: (proposed.employees ?? 0).toLocaleString('en-US'),
      note:
        employeeDifference == null
          ? 'No adopted comparison'
          : `${Math.abs(employeeDifference)} ${employeeDifference < 0 ? 'fewer' : 'more'} than adopted`,
    },
    {
      label: 'County millage',
      value: proposed.countyMillage?.toFixed(4) ?? '—',
      note:
        millageChange == null
          ? 'No adopted comparison'
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
            title="Proposed budget"
            description={
              formatReleaseDate(proposed.asOfDate)
                ? `Released ${formatReleaseDate(proposed.asOfDate)}. The County Commission may change these figures before adoption.`
                : 'The County Commission may change these figures before adoption.'
            }
            context={`${priorities.length} priorities · ${departmentCount} departments`}
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Totals"
          title="Operating and capital totals"
          description="The County calculates the proposed total the same way as the adopted total: gross operating spending minus internal transfers, plus the capital program."
        >
          <BudgetWaterfall release={proposed} />
        </ReportSection>

        <ReportSection
          number="02"
          label="Operating"
          title="Operating spending by proposed priority"
          description="The proposal groups services into seven priorities instead of the adopted budget’s nine strategic areas. The County did not publish a direct mapping between the two sets of categories."
        >
          <BudgetAllocationRibbon items={allocationItems} />
        </ReportSection>

        <ReportSection
          number="03"
          label="Change"
          title="Adopted and proposed totals"
          description={`Compares the proposal with the ${adopted?.fiscalYear ?? 'current'} adopted budget. Blue marks an increase; orange marks a decrease.`}
        >
          <BudgetComparisonTable rows={comparisons} />
        </ReportSection>

        <ReportSection
          number="04"
          label="Departments"
          title="Largest department operating changes"
          description="Appendix A restates the adopted operating budget using the proposal’s department and priority structure, allowing a consistent department comparison."
        >
          <div>
            <DepartmentChangePlot changes={departmentChanges} />
            <Link
              href="/compare"
              className="mt-5 inline-block font-heading text-sm font-bold underline decoration-mdc-blue decoration-2 underline-offset-4 hover:text-mdc-blue"
            >
              See all department changes <span aria-hidden="true">→</span>
            </Link>
          </div>
        </ReportSection>

        <ReportSection
          number="05"
          label="Priorities"
          title="Budget by proposed priority"
          description="Operating amounts are before internal transfers. Capital amounts cover the proposed multi-year program."
        >
          <PriorityBudgetTable
            priorities={priorities}
            grossOperating={proposed.grossOperating}
          />
        </ReportSection>

        <ReportSection
          number="06"
          label="Documents"
          title="County proposal documents"
          description="These are the County PDFs used for this site. Figures were checked against the published appendix totals."
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
            This is an independent presentation of Miami-Dade County budget data.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link href="/compare" className="font-bold underline decoration-mdc-green decoration-2 underline-offset-4 hover:text-white/75">
              Compare budgets <span aria-hidden="true">→</span>
            </Link>
            <Link href="/" className="font-bold underline decoration-mdc-orange decoration-2 underline-offset-4 hover:text-white/75">
              Adopted budget <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
