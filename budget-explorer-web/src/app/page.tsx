import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getAdoptedBudgetRelease,
  getQuickStats,
  getStrategicAreas,
  getRevenueSources,
} from '@/lib/db/queries'
import { BudgetAllocationRibbon } from '@/components/releases/BudgetAllocationRibbon'
import { BudgetWaterfall } from '@/components/releases/BudgetWaterfall'
import { ReleaseFacts } from '@/components/releases/ReleaseFacts'
import { ReleaseMasthead } from '@/components/releases/ReleaseMasthead'
import { ReleaseSwitcher } from '@/components/releases/ReleaseSwitcher'
import { ReportSection } from '@/components/releases/ReportSection'
import { RevenueVisualization } from '@/components/homepage/HomeCharts'

export const metadata: Metadata = {
  title: 'FY 2025–26 Adopted Budget',
  description:
    "Miami-Dade County's FY 2025–26 adopted budget by department, strategic area, revenue source, and tax rate.",
}

export const revalidate = 86400

export default async function HomePage() {
  const [release, stats, strategicAreas, revenueSources] = await Promise.all([
    getAdoptedBudgetRelease(),
    getQuickStats(),
    getStrategicAreas(),
    getRevenueSources(),
  ])
  if (!release) notFound()

  const revenueData = revenueSources.map((source) => ({
    name: source.name,
    amount: source.amount,
    percentage: source.percentage,
  }))

  const facts = [
    {
      label: 'Strategic areas',
      value: stats.strategicAreaCount.toLocaleString('en-US'),
      note: 'Used in the adopted budget',
    },
    {
      label: 'Departments',
      value: stats.departmentCount.toLocaleString('en-US'),
      note: 'With adopted budget data',
    },
    {
      label: 'Funded positions',
      value: (release.employees ?? 0).toLocaleString('en-US'),
      note: 'As published',
    },
    {
      label: 'County millage',
      value: release.countyMillage?.toFixed(4) ?? '—',
      note: 'Mills per $1,000 taxable value',
    },
  ]

  return (
    <div className="bg-[#F5F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ReleaseSwitcher activeStage="adopted" />
        <div className="mt-5">
          <ReleaseMasthead
            stage="adopted"
            fiscalYear={release.fiscalYear}
            totalBudget={release.total}
            title="Adopted budget"
            description="The spending plan currently in effect for county services, staffing, and capital projects."
            context={`${stats.strategicAreaCount} strategic areas · ${stats.departmentCount} departments`}
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Totals"
          title="Operating and capital totals"
          description="Department budgets are shown before internal county transfers. The County subtracts those transfers, then adds the capital program, to calculate the adopted total."
        >
          <BudgetWaterfall release={release} />
        </ReportSection>

        <ReportSection
          number="02"
          label="Operating"
          title="Operating spending by strategic area"
          description="The adopted budget groups services into nine strategic areas. The amounts below are shares of gross operating spending."
        >
          <BudgetAllocationRibbon items={strategicAreas} linkItems />
        </ReportSection>

        <ReportSection
          number="03"
          label="Revenue"
          title="Operating revenue by source"
          description="Property taxes fund part of the operating budget. Fees, grants, sales and gas taxes, and other sources fund the rest."
        >
          <RevenueVisualization data={revenueData} />
        </ReportSection>
      </div>

      <div className="bg-text-primary text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          <Link href="/explorer" className="border-t-2 border-mdc-blue pt-4 font-heading text-lg font-bold hover:text-white/75">
            Browse departments <span aria-hidden="true">→</span>
          </Link>
          <Link href="/calculator" className="border-t-2 border-mdc-orange pt-4 font-heading text-lg font-bold hover:text-white/75">
            Estimate property tax <span aria-hidden="true">→</span>
          </Link>
          <Link href="/compare" className="border-t-2 border-mdc-green pt-4 font-heading text-lg font-bold hover:text-white/75">
            Compare adopted and proposed <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
