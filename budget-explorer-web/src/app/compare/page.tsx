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
