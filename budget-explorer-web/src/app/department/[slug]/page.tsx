import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const dept = await prisma.departments.findFirst({
    where: { slug },
    select: { name: true },
  })

  if (!dept) {
    return { title: 'Department Not Found' }
  }

  return {
    title: `${dept.name} | Budget Explorer`,
    description: `Budget details for ${dept.name}, Miami-Dade County.`,
  }
}

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params
  const dept = await prisma.departments.findFirst({
    where: { slug },
    include: { strategic_areas: true },
  })

  if (!dept) {
    notFound()
  }

  const area = dept.strategic_areas

  return (
    <div className="px-(--spacing-page) py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Explorer', href: '/explorer' },
          { label: area.name, href: `/explorer/${area.slug}` },
          { label: dept.name },
        ]}
      />

      <div className="mt-6 mb-8">
        {/* Department name + area badge */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h1 className="text-2xl font-heading font-bold text-text-primary">
            {dept.name}
          </h1>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: area.color ?? '#6B7280' }}
          >
            {area.name}
          </span>
        </div>

        {/* Placeholder content for Phase 4 */}
        <p className="text-text-secondary mb-6">
          Department details coming in a future update.
        </p>

        {/* Skeleton placeholders suggesting future content layout */}
        <div className="space-y-6">
          {/* Budget overview skeleton */}
          <div>
            <h2 className="text-lg font-heading font-semibold text-text-primary mb-3">
              Budget Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="w-full" height="80px" />
              <Skeleton className="w-full" height="80px" />
              <Skeleton className="w-full" height="80px" />
            </div>
          </div>

          {/* Description skeleton */}
          <div>
            <h2 className="text-lg font-heading font-semibold text-text-primary mb-3">
              About This Department
            </h2>
            <Skeleton className="w-full" height="60px" />
            <Skeleton className="w-3/4 mt-2" height="20px" />
          </div>
        </div>
      </div>
    </div>
  )
}
