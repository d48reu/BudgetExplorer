type TaxSummaryHeroProps = {
  totalTax: number       // dollars
  monthlyEquivalent: number  // dollars
}

const dollarFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

/**
 * Big hero number display showing estimated annual tax bill
 * and monthly equivalent.
 */
export function TaxSummaryHero({ totalTax, monthlyEquivalent }: TaxSummaryHeroProps) {
  return (
    <div className="border-l-4 border-mdc-green py-2 pl-5 sm:pl-7">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
        Estimated annual property tax
      </p>
      <p className="mt-3 font-heading text-5xl font-bold tracking-tight text-text-primary">
        {dollarFormat.format(Math.round(totalTax))}
      </p>
      <p className="mt-2 text-lg text-text-secondary">
        {dollarFormat.format(Math.round(monthlyEquivalent))} per month
      </p>
    </div>
  )
}
