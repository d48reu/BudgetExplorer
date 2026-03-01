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
    <div className="text-center py-6">
      <p className="text-text-secondary text-sm mb-1">
        Your estimated annual tax bill
      </p>
      <p className="font-heading font-bold text-3xl text-text-primary">
        {dollarFormat.format(Math.round(totalTax))}
      </p>
      <p className="text-text-secondary text-lg mt-1">
        {dollarFormat.format(Math.round(monthlyEquivalent))}/month
      </p>
    </div>
  )
}
