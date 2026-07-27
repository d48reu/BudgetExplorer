import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AiDescription } from '@/components/department/AiDescription'
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
    title: `${detail.name} - ${detail.area.name} | Budget Explorer`,
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
      note: 'Published department total',
    },
    {
      label: 'Year-over-year',
      value: yoyChange?.value ?? '—',
      note: yoyChange ? `${yoyColor} in total budget` : 'Comparable history unavailable',
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
            description="The adopted department record: current operations, capital investment, funded positions, spending categories, and recent budget history."
            metricLabel="Adopted department total"
            metricValue={formatDollarsAbbreviated(detail.totalBudget)}
            metricNote="Operating and capital allocations combined across every adopted strategic-area slice."
            accentColor={detail.area.color}
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Department brief"
          title="What this department does"
          description="A plain-English reading of the adopted department record. Generated descriptions are labeled with their source fiscal year."
        >
          {detail.description ? (
            <div className="max-w-3xl">
              <AiDescription
                summary={detail.description.summary}
                detailedDescription={detail.description.detailedDescription}
                fiscalYear={detail.description.fiscalYear}
                generatedAt={detail.description.generatedAt}
              />
              {detail.description.keyChanges && (
                <div className="mt-6">
                  <KeyChangesCallout
                    keyChanges={detail.description.keyChanges}
                    areaColor={detail.area.color}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-secondary">Description coming soon.</p>
          )}
        </ReportSection>

        <ReportSection
          number="02"
          label="Budget composition"
          title="Operating services and capital investment"
          description="The composition strip separates recurring operating resources from the department’s multi-year capital program."
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
            title="Where department spending goes"
            description="Adopted expenditures ranked by category, with direct dollar and share labels. The table view provides exact values."
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
            title="How the department budget has changed"
            description="Up to five fiscal years of actual or adopted department totals, with proposed figures excluded from the historical series."
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
            label="Next proposal"
            title="What the FY 2026–27 proposal changes"
            description="Operating and staffing compare against Appendix A’s restated adopted baseline. Capital is shown as proposal-only because no restated adopted capital baseline is published."
          >
            <DepartmentProposalSnapshot change={proposalChange} />
          </ReportSection>
        )}

        {relatedDepts.length > 0 && (
          <ReportSection
            number="06"
            label="Related departments"
            title={`More in ${detail.area.name}`}
            description="Continue through other departments with adopted allocations in this strategic area."
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
