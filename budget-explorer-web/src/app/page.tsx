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
  title: 'Miami-Dade Budget Explorer | See Where Your Money Goes',
  description:
    "Explore Miami-Dade County's $13.2 billion FY 2025-26 adopted budget with accessible visualizations and department-level detail.",
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
      note: 'Adopted organization',
    },
    {
      label: 'Departments',
      value: stats.departmentCount.toLocaleString('en-US'),
      note: 'With adopted budget facts',
    },
    {
      label: 'Funded positions',
      value: (release.employees ?? 0).toLocaleString('en-US'),
      note: 'Published adopted release',
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
            title="Adopted county budget"
            description="The County’s current spending plan. This is the budget in force for services, staffing, and capital investment."
            context={`${stats.strategicAreaCount} strategic areas · ${stats.departmentCount} departments`}
          />
        </div>

        <ReleaseFacts facts={facts} />

        <ReportSection
          number="01"
          label="Budget math"
          title="How the adopted total is built"
          description="The published department detail begins with gross operating costs. Internal county payments are removed before capital is added to reach the adopted total."
        >
          <BudgetWaterfall release={release} />
        </ReportSection>

        <ReportSection
          number="02"
          label="Allocation"
          title="Where each operating dollar goes"
          description="The adopted budget organizes county services into nine strategic areas. The strip and ranked record use the same cents-per-dollar measure throughout the explorer."
        >
          <BudgetAllocationRibbon items={strategicAreas} linkItems />
        </ReportSection>

        <ReportSection
          number="03"
          label="Revenue"
          title="Where the money comes from"
          description="Property taxes are one part of the operating budget. Proprietary revenue, grants, sales and gas taxes, and other sources fund the remainder."
        >
          <RevenueVisualization data={revenueData} />
        </ReportSection>
      </div>

      <div className="bg-text-primary text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          <Link href="/explorer" className="border-t-2 border-mdc-blue pt-4 font-heading text-lg font-bold hover:text-white/75">
            Explore departments <span aria-hidden="true">→</span>
          </Link>
          <Link href="/calculator" className="border-t-2 border-mdc-orange pt-4 font-heading text-lg font-bold hover:text-white/75">
            Estimate property taxes <span aria-hidden="true">→</span>
          </Link>
          <Link href="/proposed" className="border-t-2 border-mdc-green pt-4 font-heading text-lg font-bold hover:text-white/75">
            Compare the proposal <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
