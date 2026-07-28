import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ExplorerTreemap } from '@/components/explorer/ExplorerCharts'
import { ExplorationMasthead } from '@/components/explorer/ExplorationMasthead'
import { StrategicAreaIndex } from '@/components/explorer/StrategicAreaIndex'
import { ReleaseFacts } from '@/components/releases/ReleaseFacts'
import { ReleaseSwitcher } from '@/components/releases/ReleaseSwitcher'
import { ReportSection } from '@/components/releases/ReportSection'
import {
  getAdoptedBudgetRelease,
  getQuickStats,
  getStrategicAreasWithDetails,
} from '@/lib/db/queries'
import { formatDollarsAbbreviated } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Departments in the FY 2025–26 Adopted Budget',
  description:
    'Miami-Dade County’s adopted operating budget by strategic area and department.',
}

export const revalidate = 86400

export default async function ExplorerPage() {
  const [areas, release, stats] = await Promise.all([
    getStrategicAreasWithDetails(),
    getAdoptedBudgetRelease(),
    getQuickStats(),
  ])
  if (!release) notFound()

  const totalOperating = areas
    .reduce((sum, area) => sum + BigInt(area.operatingBudget), BigInt(0))
    .toString()
  const treemapItems = areas.map((area) => ({
    name: area.name,
    slug: area.slug,
    color: area.color,
    value: area.operatingBudget,
  }))
  const facts = [
    {
      label: 'Strategic areas',
      value: areas.length.toLocaleString('en-US'),
      note: 'Used in the adopted budget',
    },
    {
      label: 'Departments',
      value: stats.departmentCount.toLocaleString('en-US'),
      note: 'With adopted budget data',
    },
    {
      label: 'Gross operating',
      value: formatDollarsAbbreviated(release.grossOperating),
      note: 'Before internal transfers',
    },
    {
      label: 'Capital program',
      value: formatDollarsAbbreviated(release.capital),
      note: 'Multi-year adopted program',
    },
  ]

  return (
    <div className="bg-[#F5F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ReleaseSwitcher activeStage="adopted" />
        <div className="mt-5">
          <ExplorationMasthead
            eyebrow="FY 2025–26 adopted"
            title="Departments by strategic area"
            description="The adopted budget groups departments under nine strategic areas. Open an area to see its departments and operating allocations."
            metricLabel="Gross operating budget"
            metricValue={formatDollarsAbbreviated(totalOperating)}
            metricNote="Department operating allocations before internal county transfers."
            accentColor="var(--color-mdc-blue)"
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Operating"
          title="Operating spending by strategic area"
          description="Area size represents operating dollars. Select a strategic area for department amounts, or switch to the table for exact figures."
        >
          <div className="border-y-2 border-text-primary py-5">
            <ExplorerTreemap
              areas={areas}
              treemapItems={treemapItems}
              totalBudget={totalOperating}
            />
          </div>
        </ReportSection>

        <ReportSection
          number="02"
          label="Directory"
          title="Strategic areas"
          description="Areas are ranked by gross operating spending and include department counts and share of the adopted operating budget."
        >
          <StrategicAreaIndex
            areas={[...areas].sort(
              (a, b) => Number(b.operatingBudget) - Number(a.operatingBudget)
            )}
            totalOperating={totalOperating}
          />
        </ReportSection>
      </div>

      <div className="bg-text-primary text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:px-8">
          <Link
            href="/compare"
            className="border-t-2 border-mdc-orange pt-4 font-heading text-lg font-bold hover:text-white/75"
          >
            Compare department budgets <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/search"
            className="border-t-2 border-mdc-green pt-4 font-heading text-lg font-bold hover:text-white/75"
          >
            Find a department <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
