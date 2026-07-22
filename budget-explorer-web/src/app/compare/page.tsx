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
  title: 'Adopted vs. Proposed Budget Comparison',
  description:
    'Compare Miami-Dade County department operating budgets and funded positions using the proposed budget’s restated adopted baseline.',
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
      note: 'Gross department operating baseline',
    },
    {
      label: 'Proposed',
      value: formatDollarsAbbreviated(proposedOperating.toString()),
      note: 'Gross department operating plan',
    },
    {
      label: 'Operating change',
      value: signedDollars(operatingDifference),
      note: `${operatingChange.value} from the restated baseline`,
    },
    {
      label: 'Position change',
      value: `${employeeDifference > 0 ? '+' : ''}${employeeDifference.toLocaleString('en-US')}`,
      note: 'Funded positions in comparable rows',
    },
  ]

  return (
    <div className="bg-[#F5F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ReleaseSwitcher activeStage="comparison" />
        <div className="mt-5">
          <ExplorationMasthead
            eyebrow="Release comparison"
            title="See where the proposal moves the budget"
            description="Search every department, switch between operating and workforce changes, and inspect the proposed capital plan without forcing unlike categories into a false comparison."
            metricLabel="Gross operating change"
            metricValue={operatingChange.value}
            metricNote={`${signedDollars(operatingDifference)} across ${overview.departmentCount} departments using Appendix A’s restated adopted baseline.`}
            accentColor="var(--color-mdc-green)"
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Department explorer"
          title="Filter the change, not the story"
          description="Operating and position changes compare like-for-like rows in the proposal’s Appendix A. Capital is shown as a proposed amount only because no restated adopted capital baseline is published."
        >
          <ComparisonExplorer
            changes={overview.departmentChanges}
            initialDepartment={initialDepartment}
          />
        </ReportSection>

        <ReportSection
          number="02"
          label="Method"
          title="What is—and is not—comparable"
          description="The adopted budget uses nine strategic areas while the proposal uses seven priorities. Department rows can be compared after restatement; the two category systems cannot be directly crossed without an official mapping."
        >
          <dl className="grid border-t-2 border-text-primary md:grid-cols-3">
            <div className="border-b border-text-primary py-5 md:pr-6">
              <dt className="font-heading text-lg font-bold">Operating</dt>
              <dd className="mt-2 text-sm leading-6 text-text-secondary">
                Comparable using the proposal’s restated adopted department baseline.
              </dd>
            </div>
            <div className="border-b border-text-primary py-5 md:border-l md:px-6">
              <dt className="font-heading text-lg font-bold">Positions</dt>
              <dd className="mt-2 text-sm leading-6 text-text-secondary">
                Comparable where both restated and proposed position counts are published.
              </dd>
            </div>
            <div className="border-b border-text-primary py-5 md:border-l md:pl-6">
              <dt className="font-heading text-lg font-bold">Capital</dt>
              <dd className="mt-2 text-sm leading-6 text-text-secondary">
                Proposed program only; no restated adopted capital baseline is asserted.
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
            Read the adopted budget <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/proposed"
            className="border-t-2 border-mdc-orange pt-4 font-heading text-lg font-bold hover:text-white/75"
          >
            Read the full proposal <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
