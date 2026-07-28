import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdoptedStrategicAreaSlugs, getAreaWithDepartments } from '@/lib/db/queries'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ExplorationMasthead } from '@/components/explorer/ExplorationMasthead'
import { AreaDeptTreemap } from '@/components/explorer/ExplorerCharts'
import { DepartmentList } from '@/components/explorer/DepartmentList'
import { ReleaseFacts } from '@/components/releases/ReleaseFacts'
import { ReleaseSwitcher } from '@/components/releases/ReleaseSwitcher'
import { ReportSection } from '@/components/releases/ReportSection'
import { formatDollarsAbbreviated } from '@/lib/format'
import type { Metadata } from 'next'

// Static with daily revalidation, matching the department pages.
export const revalidate = 86400

/** Pre-render all 9 strategic area pages at build time. */
export async function generateStaticParams() {
  const slugs = await getAdoptedStrategicAreaSlugs()
  return slugs.map((slug) => ({ 'area-slug': slug }))
}

type PageProps = {
  params: Promise<{ 'area-slug': string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { 'area-slug': areaSlug } = await params
  const data = await getAreaWithDepartments(areaSlug)

  if (!data) {
    return { title: 'Area Not Found' }
  }

  return {
    title: `${data.area.name} budget`,
    description: `Adopted budget figures for ${data.area.departmentCount} departments in Miami-Dade County’s ${data.area.name} strategic area.`,
  }
}

export default async function AreaDetailPage({ params }: PageProps) {
  const { 'area-slug': areaSlug } = await params
  const data = await getAreaWithDepartments(areaSlug)

  if (!data) {
    notFound()
  }

  const { area, departments } = data
  const employeeCount = departments.reduce(
    (total, department) => total + (department.employeeCount ?? 0),
    0
  )

  // Build treemap items from departments
  const treemapItems = departments.map((dept) => ({
    name: dept.name,
    slug: dept.slug,
    color: area.color,
    value: dept.operatingBudget,
  }))
  const facts = [
    {
      label: 'Operating',
      value: formatDollarsAbbreviated(area.operatingBudget),
      note: 'Gross adopted allocation',
    },
    {
      label: 'Capital',
      value: formatDollarsAbbreviated(area.capitalBudget),
      note: 'Multi-year adopted program',
    },
    {
      label: 'Departments',
      value: area.departmentCount.toLocaleString('en-US'),
      note: 'With allocations in this area',
    },
    {
      label: 'Funded positions',
      value: employeeCount.toLocaleString('en-US'),
      note: 'Across listed department slices',
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
              { label: area.name },
            ]}
          />
        </div>

        <div className="mt-5">
          <ExplorationMasthead
            eyebrow="Adopted strategic area"
            title={area.name}
            description={
              area.description ??
              'Departments and adopted budget amounts assigned to this strategic area.'
            }
            metricLabel="Operating allocation"
            metricValue={formatDollarsAbbreviated(area.operatingBudget)}
            metricNote={`${area.centsPerDollar ?? 0} cents of each adopted operating dollar across ${area.departmentCount} departments.`}
            accentColor={area.color}
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Operating"
          title="Department operating budgets"
          description="Area size represents each department’s operating allocation within this strategic area. Select a department for more detail."
        >
          <div className="border-y-2 border-text-primary py-5">
            <AreaDeptTreemap
              areaName={area.name}
              departments={departments}
              treemapItems={treemapItems}
            />
          </div>
        </ReportSection>

        <ReportSection
          number="02"
          label="Departments"
          title="Departments in this strategic area"
          description="Sort by operating budget, capital budget, funded positions, or name. For departments assigned to more than one area, this table shows only the amount assigned here."
        >
          <DepartmentList departments={departments} areaColor={area.color} />
        </ReportSection>
      </div>

      <div className="bg-text-primary text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="max-w-2xl text-sm text-white/70">
            The proposal uses seven priorities instead of these nine strategic areas. Compare department figures rather than area totals.
          </p>
          <Link
            href="/compare"
            className="font-bold underline decoration-mdc-orange decoration-2 underline-offset-4 hover:text-white/75"
          >
            Compare department budgets <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
