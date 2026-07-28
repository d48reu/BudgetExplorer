import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ComparisonExplorer } from '@/components/comparison/ComparisonExplorer'
import { ExplorationMasthead } from '@/components/explorer/ExplorationMasthead'
import { ReleaseFacts } from '@/components/releases/ReleaseFacts'
import { ReleaseSwitcher } from '@/components/releases/ReleaseSwitcher'
import { ReportSection } from '@/components/releases/ReportSection'
import { formatDollarsAbbreviated, formatYoYChange } from '@/lib/format'
import { getProposedBudgetOverview } from '@/lib/db/queries'

export const metadata: Metadata = {
  title: 'Adopted and Proposed Department Budgets',
  description:
    'Compare Miami-Dade County department operating budgets and funded positions using the restated adopted figures published with the proposal.',
}

export const revalidate = 86400

type PageProps = {
  searchParams: Promise<{ department?: string | string[] }>
}

function signedDollars(cents: bigint) {
  const prefix = cents > 0 ? '+' : cents < 0 ? '−' : ''
  return `${prefix}${formatDollarsAbbreviated(Number(cents < 0 ? -cents : cents))}`
}

export default async function ComparisonPage({ searchParams }: PageProps) {
  const [overview, params] = await Promise.all([
    getProposedBudgetOverview(),
    searchParams,
  ])
  if (!overview) notFound()

  const baselineOperating = overview.departmentChanges.reduce(
    (total, department) => total + BigInt(department.baselineOperating),
    BigInt(0)
  )
  const proposedOperating = overview.departmentChanges.reduce(
    (total, department) => total + BigInt(department.proposedOperating),
    BigInt(0)
  )
  const operatingDifference = proposedOperating - baselineOperating
  const employeeDifference = overview.departmentChanges.reduce(
    (total, department) => total + (department.employeeChange ?? 0),
    0
  )
  const operatingChange = formatYoYChange(
    proposedOperating.toString(),
    baselineOperating.toString()
  )
  const initialDepartment = Array.isArray(params.department)
    ? params.department[0]
    : params.department
  const volume1Source =
    overview.sources.volume1 ??
    'https://www.miamidade.gov/resources/budget/fy-26-27/proposed/volume-1-bookmarks.pdf'
  const appendixASource = `${volume1Source}#page=109`
  const appendixHSource = `${volume1Source}#page=144`

  const facts = [
    {
      label: 'Restated adopted',
      value: formatDollarsAbbreviated(baselineOperating.toString()),
      note: 'FY 2025–26 department operating',
    },
    {
      label: 'Proposed',
      value: formatDollarsAbbreviated(proposedOperating.toString()),
      note: 'FY 2026–27 department operating',
    },
    {
      label: 'Operating change',
      value: signedDollars(operatingDifference),
      note: `${operatingChange.value} from the restated baseline`,
    },
    {
      label: 'Position change',
      value: `${employeeDifference > 0 ? '+' : ''}${employeeDifference.toLocaleString('en-US')}`,
      note: 'Across departments with both counts',
    },
  ]

  return (
    <div className="bg-[#F5F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ReleaseSwitcher activeStage="comparison" />
        <div className="mt-5">
          <ExplorationMasthead
            eyebrow="Adopted and proposed"
            title="Department budget changes"
            description="Compare department operating budgets and funded positions. Proposed capital is listed separately because the County did not publish a restated adopted capital baseline."
            metricLabel="Gross operating change"
            metricValue={operatingChange.value}
            metricNote={`${signedDollars(operatingDifference)} across ${overview.departmentCount} departments, compared with Appendix A’s restated adopted figures.`}
            accentColor="var(--color-mdc-green)"
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Departments"
          title="Compare departments"
          description="Operating and position changes use the restated adopted figures in Appendix A. Capital amounts are proposal only."
        >
          <ComparisonExplorer
            changes={overview.departmentChanges}
            initialDepartment={initialDepartment}
          />
        </ReportSection>

        <ReportSection
          number="02"
          label="Notes"
          title="Comparison rules"
          description="The adopted budget uses nine strategic areas; the proposal uses seven priorities. Department figures can be compared after restatement, but the two category systems cannot be matched directly."
        >
          <dl className="grid border-t-2 border-text-primary md:grid-cols-3">
            <div className="border-b border-text-primary py-5 md:pr-6">
              <dt className="font-heading text-lg font-bold">Operating</dt>
              <dd className="mt-2 text-sm leading-6 text-text-secondary">
                Compared with the restated adopted department amounts in Appendix A.
              </dd>
            </div>
            <div className="border-b border-text-primary py-5 md:border-l md:px-6">
              <dt className="font-heading text-lg font-bold">Positions</dt>
              <dd className="mt-2 text-sm leading-6 text-text-secondary">
                Compared only when Appendix A publishes both position counts.
              </dd>
            </div>
            <div className="border-b border-text-primary py-5 md:border-l md:pl-6">
              <dt className="font-heading text-lg font-bold">Capital</dt>
              <dd className="mt-2 text-sm leading-6 text-text-secondary">
                Proposal only. The County did not publish a restated adopted capital amount.
              </dd>
            </div>
          </dl>
          <div className="mt-7 border-l-4 border-mdc-blue pl-4">
            <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-text-primary">
              Official source
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
              Department operating budgets and positions come from{' '}
              <a
                href={appendixASource}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-mdc-blue underline decoration-1 underline-offset-4 hover:text-text-primary"
              >
                Volume 1, Appendix A (PDF pages 109–116)
              </a>
              . Proposed FY 2026–27 capital amounts come from{' '}
              <a
                href={appendixHSource}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-mdc-blue underline decoration-1 underline-offset-4 hover:text-text-primary"
              >
                Volume 1, Appendix H (PDF pages 144–145)
              </a>
              . The{' '}
              <Link
                href="/audit"
                className="font-bold text-mdc-blue underline decoration-1 underline-offset-4 hover:text-text-primary"
              >
                number audit
              </Link>{' '}
              traces each published figure to its source page.
            </p>
          </div>
        </ReportSection>
      </div>

      <div className="bg-text-primary text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="border-t-2 border-mdc-blue pt-4 font-heading text-lg font-bold hover:text-white/75"
          >
            Adopted budget <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/proposed"
            className="border-t-2 border-mdc-orange pt-4 font-heading text-lg font-bold hover:text-white/75"
          >
            Proposed budget <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
