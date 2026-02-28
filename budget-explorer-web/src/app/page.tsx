import { getCurrentFiscalYear, getQuickStats } from '@/lib/db/queries'
import { HeroBanner } from '@/components/homepage/HeroBanner'
import { QuickStats } from '@/components/homepage/QuickStats'
import { CTASection } from '@/components/homepage/CTASection'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Miami-Dade Budget Explorer | See Where Your Money Goes',
  description:
    "Explore Miami-Dade County's $13.2 billion FY 2025-26 budget with interactive visualizations. See how your tax dollars fund county services, from public safety to infrastructure.",
}

// This page queries the database at request time
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [fiscalYear, stats] = await Promise.all([
    getCurrentFiscalYear(),
    getQuickStats(),
  ])

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

      {/* Phase 3: Visualization placeholders */}
      <section
        aria-label="Budget visualizations"
        className="py-(--spacing-section)"
      >
        {/* Treemap: department spending proportions */}
        {/* Penny visualization: where each penny of your tax dollar goes */}
        {/* Revenue donut: sources of county revenue */}
      </section>
    </>
  )
}
