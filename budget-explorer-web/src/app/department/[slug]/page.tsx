import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { DepartmentDescription } from '@/components/department/DepartmentDescription'
import { DepartmentBudgetMix } from '@/components/department/DepartmentBudgetMix'
import { DepartmentProposalSnapshot } from '@/components/department/DepartmentProposalSnapshot'
import { KeyChangesCallout } from '@/components/department/KeyChangesCallout'
import { RelatedDepartments } from '@/components/department/RelatedDepartments'
import { ExplorationMasthead } from '@/components/explorer/ExplorationMasthead'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ReleaseFacts } from '@/components/releases/ReleaseFacts'
import { ReleaseSwitcher } from '@/components/releases/ReleaseSwitcher'
import { ReportSection } from '@/components/releases/ReportSection'
import { ExpenditureBreakdown } from '@/components/charts/ExpenditureBreakdown'
import { YearOverYearChart } from '@/components/charts/YearOverYearChart'
import {
  getAdoptedDepartmentSlugs,
  getDepartmentDetail,
  getDepartmentExpenditures,
  getDepartmentProposalChange,
  getDepartmentYoY,
  getRelatedDepartments,
} from '@/lib/db/queries'
import { formatDollarsAbbreviated, formatYoYChange } from '@/lib/format'

export const revalidate = 86400

export async function generateStaticParams() {
  const slugs = await getAdoptedDepartmentSlugs()
  return slugs.map((slug) => ({ slug }))
}

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const detail = await getDepartmentDetail(slug)

  if (!detail) return { title: 'Department Not Found' }

  return {
    title: `${detail.name} — ${detail.area.name}`,
    description: `Adopted budget, spending composition, history, and proposed change for ${detail.name}, Miami-Dade County.`,
  }
}

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params
  const detail = await getDepartmentDetail(slug)
  if (!detail) notFound()

  const [expenditures, yoyData, relatedDepts, proposalChange] =
    await Promise.all([
      getDepartmentExpenditures(detail.id),
      getDepartmentYoY(detail.id),
      getRelatedDepartments(detail.area.id, detail.id),
      getDepartmentProposalChange(slug),
    ])

  const currentIndex = yoyData.findIndex((entry) => entry.isCurrent)
  const currentYear = currentIndex >= 0 ? yoyData[currentIndex] : null
  const priorYear = currentIndex > 0 ? yoyData[currentIndex - 1] : null
  const yoyChange =
    currentYear && priorYear
      ? formatYoYChange(currentYear.totalBudget, priorYear.totalBudget)
      : null
  const yoyColor =
    yoyChange?.direction === 'increase'
      ? 'Increase'
      : yoyChange?.direction === 'decrease'
        ? 'Decrease'
        : 'No material change'
  const facts = [
    {
      label: 'Operating',
      value: formatDollarsAbbreviated(detail.operatingBudget),
      note: 'Annual adopted operations',
    },
    {
      label: 'Capital',
      value: formatDollarsAbbreviated(detail.capitalBudget),
      note: 'Multi-year adopted program',
    },
    {
      label: 'Funded positions',
      value: detail.employeeCount?.toLocaleString('en-US') ?? '—',
      note: 'As published',
    },
    {
      label: 'Year-over-year',
      value: yoyChange?.value ?? '—',
      note: yoyChange ? `${yoyColor} in total budget` : 'No comparable history',
    },
  ]

  return (
    <div className="bg-[#F5F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ReleaseSwitcher activeStage="adopted" />
        <div className="mt-5">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Explorer', href: '/explorer' },
              { label: detail.area.name, href: `/explorer/${detail.area.slug}` },
              { label: detail.name },
            ]}
          />
        </div>

        <div className="mt-5">
          <ExplorationMasthead
            eyebrow={`${detail.area.name} department`}
            title={detail.name}
            description="Adopted operating, capital, position, and expenditure data, with recent budget history and the FY 2026–27 proposal."
            metricLabel="Adopted department total"
            metricValue={formatDollarsAbbreviated(detail.totalBudget)}
            metricNote="Operating and capital allocations across all adopted strategic areas."
            accentColor={detail.area.color}
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Overview"
          title="Department overview"
          description="Service responsibilities and the latest adopted operating change."
        >
          {detail.description ? (
            <div className="max-w-3xl">
              <DepartmentDescription
                summary={detail.description.summary}
                slug={detail.slug}
                fiscalYear={detail.description.fiscalYear}
              />
              {currentYear && priorYear && (
                <div className="mt-6">
                  <KeyChangesCallout
                    currentFiscalYear={currentYear.fiscalYear}
                    currentOperating={currentYear.operatingBudget}
                    priorFiscalYear={priorYear.fiscalYear}
                    priorOperating={priorYear.operatingBudget}
                    areaColor={detail.area.color}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-secondary">No department description is available.</p>
          )}
        </ReportSection>

        <ReportSection
          number="02"
          label="Budget"
          title="Operating and capital"
          description="Operating covers annual services and staffing. Capital covers the department’s multi-year investment program."
        >
          <DepartmentBudgetMix
            operatingBudget={detail.operatingBudget}
            capitalBudget={detail.capitalBudget}
            accentColor={detail.area.color}
          />
        </ReportSection>

        {expenditures.length > 0 && (
          <ReportSection
            number="03"
            label="Expenditures"
            title="Expenditures by category"
            description="Adopted expenditure categories ranked by amount. Switch to the table for exact figures."
          >
            <ExpenditureBreakdown
              data={expenditures}
              areaColor={detail.area.color ?? '#0057B8'}
            />
          </ReportSection>
        )}

        {yoyData.length > 0 && (
          <ReportSection
            number="04"
            label="History"
            title="Total budget by fiscal year"
            description="Up to five fiscal years of actual or adopted department totals. Proposed figures are not included."
          >
            <YearOverYearChart
              data={yoyData}
              areaColor={detail.area.color ?? '#6B7280'}
            />
          </ReportSection>
        )}

        {proposalChange && (
          <ReportSection
            number="05"
            label="Proposal"
            title="FY 2026–27 proposed changes"
            description="Operating and position figures are compared with Appendix A’s restated adopted amounts. Capital is proposal only."
          >
            <DepartmentProposalSnapshot change={proposalChange} />
          </ReportSection>
        )}

        {relatedDepts.length > 0 && (
          <ReportSection
            number="06"
            label="Departments"
            title={`Other departments in ${detail.area.name}`}
            description="Departments with adopted operating allocations in the same strategic area."
          >
            <RelatedDepartments
              departments={relatedDepts}
              areaName={detail.area.name}
              areaSlug={detail.area.slug}
            />
          </ReportSection>
        )}
      </div>
    </div>
  )
}
