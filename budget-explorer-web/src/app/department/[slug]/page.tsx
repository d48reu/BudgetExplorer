import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { StatCards } from '@/components/department/StatCards'
import { AiDescription } from '@/components/department/AiDescription'
import { KeyChangesCallout } from '@/components/department/KeyChangesCallout'
import { RelatedDepartments } from '@/components/department/RelatedDepartments'
import { ExpenditureBreakdown } from '@/components/charts/ExpenditureBreakdown'
import { YearOverYearChart } from '@/components/charts/YearOverYearChart'
import {
  getDepartmentDetail,
  getDepartmentExpenditures,
  getDepartmentYoY,
  getRelatedDepartments,
  getAdoptedDepartmentSlugs,
} from '@/lib/db/queries'
import { formatYoYChange } from '@/lib/format'
import type { Metadata } from 'next'

/** Pre-render department pages that belong to the adopted release. */
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

  if (!detail) {
    return { title: 'Department Not Found' }
  }

  return {
    title: `${detail.name} - ${detail.area.name} | Budget Explorer`,
    description: `Budget details for ${detail.name}, Miami-Dade County.`,
  }
}

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params
  const detail = await getDepartmentDetail(slug)

  if (!detail) {
    notFound()
  }

  // Fetch remaining data in parallel now that we have dept id and area id
  const [expenditures, yoyData, relatedDepts] = await Promise.all([
    getDepartmentExpenditures(detail.id),
    getDepartmentYoY(detail.id),
    getRelatedDepartments(detail.area.id, detail.id),
  ])

  // Compute YoY change for stat card
  let yoyChange: { value: string; direction: 'increase' | 'decrease' | 'unchanged' } | null = null
  if (yoyData.length >= 2) {
    const currentYear = yoyData.find(d => d.isCurrent)
    const currentIndex = yoyData.findIndex(d => d.isCurrent)
    const priorYear = currentIndex > 0 ? yoyData[currentIndex - 1] : null
    if (currentYear && priorYear) {
      yoyChange = formatYoYChange(currentYear.totalBudget, priorYear.totalBudget)
    }
  }

  return (
    <div className="px-(--spacing-page) py-6">
      {/* Section 1: Breadcrumbs + department name + area badge */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Explorer', href: '/explorer' },
          { label: detail.area.name, href: `/explorer/${detail.area.slug}` },
          { label: detail.name },
        ]}
      />

      <div className="mt-6 mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-2xl font-heading font-bold text-text-primary">
            {detail.name}
          </h1>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: detail.area.color ?? '#6B7280' }}
          >
            {detail.area.name}
          </span>
        </div>

        {/* Section 2: Stat cards */}
        <StatCards
          operatingBudget={detail.operatingBudget}
          capitalBudget={detail.capitalBudget}
          employeeCount={detail.employeeCount}
          yoyChange={yoyChange}
        />

        {/* Section 3: AI description */}
        <div className="mt-8">
          <h2 className="text-lg font-heading font-semibold text-text-primary mb-3">
            About This Department
          </h2>
          {detail.description ? (
            <AiDescription
              summary={detail.description.summary}
              detailedDescription={detail.description.detailedDescription}
              fiscalYear={detail.description.fiscalYear}
              generatedAt={detail.description.generatedAt}
            />
          ) : (
            <p className="text-text-secondary text-sm italic">
              Description coming soon.
            </p>
          )}
        </div>

        {/* Section 4: Key changes callout */}
        {detail.description?.keyChanges && (
          <div className="mt-6">
            <KeyChangesCallout
              keyChanges={detail.description.keyChanges}
              areaColor={detail.area.color}
            />
          </div>
        )}

        {/* Section 5: Expenditure category breakdown */}
        {expenditures.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-heading font-semibold text-text-primary mb-3">
              Expenditure Breakdown
            </h2>
            <ExpenditureBreakdown
              data={expenditures}
              areaColor={detail.area.color ?? '#0057B8'}
            />
          </div>
        )}

        {/* Section 6: Year-over-year budget chart */}
        {yoyData.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-heading font-semibold text-text-primary mb-4">
              Budget History
            </h2>
            <YearOverYearChart
              data={yoyData}
              areaColor={detail.area.color ?? '#6B7280'}
            />
          </section>
        )}

        {/* Section 7: Related departments */}
        {relatedDepts.length > 0 && (
          <div className="mt-8">
            <RelatedDepartments
              departments={relatedDepts}
              areaName={detail.area.name}
              areaSlug={detail.area.slug}
            />
          </div>
        )}
      </div>
    </div>
  )
}
