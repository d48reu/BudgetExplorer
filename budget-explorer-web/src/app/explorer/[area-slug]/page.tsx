import { notFound } from 'next/navigation'
import { getAreaWithDepartments } from '@/lib/db/queries'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { AreaHeader } from '@/components/explorer/AreaHeader'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'
import { Treemap } from '@/components/charts/Treemap'
import { DepartmentList } from '@/components/explorer/DepartmentList'
import { formatDollarsAbbreviated } from '@/lib/format'
import type { Metadata } from 'next'
import type { TableColumn, SerializedDepartment } from '@/types/budget'

export const dynamic = 'force-dynamic'

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

const deptTableColumns: TableColumn<SerializedDepartment>[] = [
  {
    key: 'name',
    label: 'Department',
    align: 'left',
  },
  {
    key: 'operatingBudget',
    label: 'Operating Budget',
    align: 'right',
    format: (value) => formatDollarsAbbreviated(value as string),
  },
  {
    key: 'employeeCount',
    label: 'Employees',
    align: 'right',
    format: (value) => (value != null ? Number(value).toLocaleString() : 'N/A'),
  },
]

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
        <DataTableToggle
          chartLabel={`${area.name} department budget treemap`}
          data={departments}
          columns={deptTableColumns}
        >
          <ChartContainer minHeight={350}>
            {({ width, height }) => (
              <Treemap
                items={treemapItems}
                width={width}
                height={height}
                linkPrefix="/department/"
                ariaLabel={`Department budget treemap for ${area.name}. Click any department to view details.`}
              />
            )}
          </ChartContainer>
        </DataTableToggle>
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
