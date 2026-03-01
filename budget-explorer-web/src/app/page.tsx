import {
  getCurrentFiscalYear,
  getQuickStats,
  getStrategicAreas,
  getRevenueSources,
} from '@/lib/db/queries'
import { HeroBanner } from '@/components/homepage/HeroBanner'
import { QuickStats } from '@/components/homepage/QuickStats'
import { CTASection } from '@/components/homepage/CTASection'
import { WaffleSection, RevenueSection } from '@/components/homepage/HomeCharts'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Miami-Dade Budget Explorer | See Where Your Money Goes',
  description:
    "Explore Miami-Dade County's $13.2 billion FY 2025-26 budget with interactive visualizations. See how your tax dollars fund county services, from public safety to infrastructure.",
}

// This page queries the database at request time
export const dynamic = 'force-dynamic'

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

  // Revenue data for donut chart
  const revenueData = revenueSources.map((r) => ({
    name: r.name,
    amount: r.amount,
    percentage: r.percentage,
  }))

  const fyLabel = fiscalYear?.label ?? null

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
      <WaffleSection areas={waffleAreas} fiscalYearLabel={fyLabel} />
      <RevenueSection data={revenueData} fiscalYearLabel={fyLabel} />
    </>
  )
}
