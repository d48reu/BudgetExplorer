import { getMillageRates, getStrategicAreas } from '@/lib/db/queries'
import { TaxCalculator } from '@/components/calculator/TaxCalculator'
import { UtilityMasthead } from '@/components/layout/UtilityMasthead'
import { ReleaseSwitcher } from '@/components/releases/ReleaseSwitcher'
import { ReportSection } from '@/components/releases/ReportSection'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Property Tax Estimate',
  description:
    'Estimate property taxes using Miami-Dade County FY 2025–26 millage rates.',
}

// Millage rates change once a year; the calculator itself is client-side.
export const revalidate = 86400

export default async function CalculatorPage() {
  const [rates, areas] = await Promise.all([
    getMillageRates(),
    getStrategicAreas(),
  ])
  const totalMillage = rates.reduce((sum, rate) => sum + rate.millageRate, 0)

  return (
    <div className="bg-[#F5F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ReleaseSwitcher activeStage="adopted" />
        <div className="mt-5">
          <UtilityMasthead
            eyebrow="Property tax tool"
            title="Estimate property taxes"
            description="Enter a property’s assessed value to estimate its annual taxes using the FY 2025–26 published millage rates."
            metricLabel="Combined published rate"
            metricValue={`${totalMillage.toFixed(4)} mills`}
            metricNote="County and non-county authorities represented in this estimate."
            accentColor="var(--color-mdc-orange)"
          />
        </div>

        <ReportSection
          number="01"
          label="Estimate"
          title="Property value and tax estimate"
          description="This estimate uses assessed value, not market value. Choose whether the property receives a homestead exemption."
        >
          <TaxCalculator rates={rates} areas={areas} />
        </ReportSection>
      </div>
    </div>
  )
}
