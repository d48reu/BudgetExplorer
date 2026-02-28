'use client'

import CountUp from 'react-countup'

type HeroBannerProps = {
  totalBudgetCents: string
}

export function HeroBanner({ totalBudgetCents }: HeroBannerProps) {
  const totalBillions = Number(totalBudgetCents) / 100 / 1_000_000_000

  return (
    <section
      aria-label="Budget overview"
      className="flex flex-col items-center justify-center text-center py-16 md:py-24 px-4"
    >
      <p className="text-sm uppercase tracking-wider text-text-secondary mb-2">
        Miami-Dade County FY 2025-26 Total Budget
      </p>
      <p className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold text-text-primary">
        <CountUp
          end={totalBillions}
          decimals={1}
          duration={2}
          separator=","
          prefix="$"
          suffix="B"
          enableScrollSpy
          scrollSpyOnce
        />
      </p>
      <p className="mt-4 text-lg md:text-xl text-text-secondary">
        See where your money goes.
      </p>
    </section>
  )
}
