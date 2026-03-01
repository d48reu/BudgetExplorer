import {
  getCurrentFiscalYear,
  getQuickStats,
  getStrategicAreas,
  getRevenueSources,
} from '@/lib/db/queries'
import { HeroBanner } from '@/components/homepage/HeroBanner'
import { QuickStats } from '@/components/homepage/QuickStats'
import { CTASection } from '@/components/homepage/CTASection'
import { WaffleChart } from '@/components/charts/WaffleChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'
import { formatDollarsAbbreviated } from '@/lib/format'
import { formatPercentage } from '@/lib/chart-utils'

import type { Metadata } from 'next'
import type { TableColumn } from '@/types/budget'

export const metadata: Metadata = {
  title: 'Miami-Dade Budget Explorer | See Where Your Money Goes',
  description:
    "Explore Miami-Dade County's $13.2 billion FY 2025-26 budget with interactive visualizations. See how your tax dollars fund county services, from public safety to infrastructure.",
}

// This page queries the database at request time
export const dynamic = 'force-dynamic'

// Table column definitions for the waffle chart data table
type WaffleTableRow = {
  name: string
  centsPerDollar: number
  operatingBudget: string
}

const waffleColumns: TableColumn<WaffleTableRow>[] = [
  { key: 'name', label: 'Strategic Area' },
  {
    key: 'centsPerDollar',
    label: 'Cents per Dollar',
    align: 'right',
    format: (v) => `${v as number}\u00A2`,
  },
  {
    key: 'operatingBudget',
    label: 'Operating Budget',
    align: 'right',
    format: (v) => formatDollarsAbbreviated(v as string),
  },
]

// Table column definitions for the revenue donut data table
type RevenueTableRow = {
  name: string
  amount: string
  percentage: number | null
}

const revenueColumns: TableColumn<RevenueTableRow>[] = [
  { key: 'name', label: 'Revenue Source' },
  {
    key: 'amount',
    label: 'Amount',
    align: 'right',
    format: (v) => formatDollarsAbbreviated(v as string),
  },
  {
    key: 'percentage',
    label: 'Percentage',
    align: 'right',
    format: (v) => (v != null ? formatPercentage(v as number) : ''),
  },
]

export default async function HomePage() {
  const [fiscalYear, stats, strategicAreas, revenueSources] = await Promise.all([
    getCurrentFiscalYear(),
    getQuickStats(),
    getStrategicAreas(),
    getRevenueSources(),
  ])

  // Filter areas with valid waffle data (non-null centsPerDollar and color)
  const waffleAreas = strategicAreas
    .filter((a) => a.centsPerDollar != null && a.color != null)
    .map((a) => ({
      name: a.name,
      slug: a.slug,
      color: a.color!,
      centsPerDollar: a.centsPerDollar!,
      operatingBudget: a.operatingBudget,
    }))

  // Table data for waffle (same shape minus slug/color)
  const waffleTableData: WaffleTableRow[] = waffleAreas.map((a) => ({
    name: a.name,
    centsPerDollar: a.centsPerDollar,
    operatingBudget: a.operatingBudget,
  }))

  // Revenue data for donut chart
  const revenueData: RevenueTableRow[] = revenueSources.map((r) => ({
    name: r.name,
    amount: r.amount,
    percentage: r.percentage,
  }))

  return (
    <>
      <HeroBanner totalBudgetCents={fiscalYear?.totalBudget ?? '0'} />
      <QuickStats
        strategicAreaCount={stats.strategicAreaCount}
        departmentCount={stats.departmentCount}
        totalEmployees={stats.totalEmployees}
        fiscalYear={stats.fiscalYear}
      />
      <CTASection />

      {/* Where Each Dollar Goes -- Waffle Chart */}
      <section
        aria-label="Where each dollar goes"
        className="py-(--spacing-section) px-4 max-w-4xl mx-auto"
      >
        <h2 className="text-2xl font-heading font-bold mb-2">
          Where Each Dollar Goes
        </h2>
        {fiscalYear && (
          <p className="text-text-secondary mb-6">
            Of every dollar in the {fiscalYear.label} budget...
          </p>
        )}
        {waffleAreas.length > 0 ? (
          <DataTableToggle
            chartLabel="Where each dollar goes"
            data={waffleTableData}
            columns={waffleColumns}
          >
            <WaffleChart areas={waffleAreas} />
          </DataTableToggle>
        ) : (
          <p className="text-text-muted text-center py-8">
            Budget data loading...
          </p>
        )}
      </section>

      {/* Where the Money Comes From -- Revenue Donut */}
      <section
        aria-label="Where the money comes from"
        className="py-(--spacing-section) px-4 max-w-4xl mx-auto"
      >
        <h2 className="text-2xl font-heading font-bold mb-2">
          Where the Money Comes From
        </h2>
        {fiscalYear && (
          <p className="text-text-secondary mb-6">
            Revenue sources for {fiscalYear.label}
          </p>
        )}
        {revenueData.length > 0 ? (
          <DataTableToggle
            chartLabel="Revenue sources"
            data={revenueData}
            columns={revenueColumns}
          >
            <ChartContainer aspectRatio={1} minHeight={300}>
              {({ width, height }) => (
                <DonutChart data={revenueData} width={width} height={height} />
              )}
            </ChartContainer>
          </DataTableToggle>
        ) : (
          <p className="text-text-muted text-center py-8">
            Revenue data coming soon.
          </p>
        )}
      </section>
    </>
  )
}
