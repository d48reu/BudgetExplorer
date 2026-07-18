import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getAreaWithDepartments } from '@/lib/db/queries'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { AreaHeader } from '@/components/explorer/AreaHeader'
import { AreaDeptTreemap } from '@/components/explorer/ExplorerCharts'
import { DepartmentList } from '@/components/explorer/DepartmentList'
import type { Metadata } from 'next'

// Static with daily revalidation, matching the department pages.
export const revalidate = 86400

/** Pre-render all 9 strategic area pages at build time. */
export async function generateStaticParams() {
  const areas = await prisma.strategic_areas.findMany({
    select: { slug: true },
  })
  return areas.map((area) => ({ 'area-slug': area.slug }))
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
    title: `${data.area.name} | Budget Explorer`,
    description: `Explore departments and budgets within ${data.area.name}. ${data.area.departmentCount} departments in this strategic area.`,
  }
}

export default async function AreaDetailPage({ params }: PageProps) {
  const { 'area-slug': areaSlug } = await params
  const data = await getAreaWithDepartments(areaSlug)

  if (!data) {
    notFound()
  }

  const { area, departments } = data

  // Build treemap items from departments
  const treemapItems = departments.map((dept) => ({
    name: dept.name,
    slug: dept.slug,
    color: area.color,
    value: dept.operatingBudget,
  }))

  return (
    <div className="px-(--spacing-page) py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Explorer', href: '/explorer' },
          { label: area.name },
        ]}
      />

      <div className="mt-6">
        <AreaHeader area={area} />
      </div>

      {/* Desktop: department treemap with data table toggle */}
      <div className="hidden md:block mb-8">
        <AreaDeptTreemap
          areaName={area.name}
          departments={departments}
          treemapItems={treemapItems}
        />
      </div>

      {/* Department list (visible on all screen sizes) */}
      <section className="mt-8">
        <h2 className="text-lg font-heading font-semibold text-text-primary mb-4">
          Departments
        </h2>
        <DepartmentList departments={departments} areaColor={area.color} />
      </section>
    </div>
  )
}
