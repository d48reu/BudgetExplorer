export type GlossaryTerm = {
  term: string
  definition: string
  slug: string
}

/**
 * Budget terminology with plain-English definitions.
 * Used by the BudgetTerm tooltip component and the /glossary page.
 * Sorted alphabetically by term.
 */
export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Ad Valorem Tax',
    definition:
      'A property tax based on the assessed value of your home or business. "Ad valorem" means "according to value" in Latin. This is the main way Miami-Dade County raises revenue.',
    slug: 'ad-valorem-tax',
  },
  {
    term: 'Adopted Budget',
    definition:
      'The final spending plan approved by the Board of County Commissioners for a fiscal year. Once adopted, it authorizes departments to spend up to their budgeted amounts.',
    slug: 'adopted-budget',
  },
  {
    term: 'Capital Budget',
    definition:
      'Money set aside for building, buying, or improving long-term assets like roads, parks, buildings, and transit systems. These are one-time investments, not ongoing operating costs.',
    slug: 'capital-budget',
  },
  {
    term: 'Enterprise Fund',
    definition:
      'A self-sustaining county service that operates like a business, funded by fees rather than taxes. Examples include Water and Sewer, Solid Waste, and Aviation (airports). Users of the service pay for it directly.',
    slug: 'enterprise-fund',
  },
  {
    term: 'Fiscal Year',
    definition:
      'The county\'s 12-month budget cycle, which runs from October 1 to September 30. "FY 2025-26" means October 2025 through September 2026.',
    slug: 'fiscal-year',
  },
  {
    term: 'Fringes',
    definition:
      'Employee benefit costs beyond salary, including health insurance, retirement contributions, Social Security, and workers\' compensation. Fringes typically add 30-40% on top of base salary costs.',
    slug: 'fringes',
  },
  {
    term: 'General Fund',
    definition:
      'The county\'s main operating account, funded primarily by property taxes. It pays for core services like police, fire rescue, parks, libraries, and public works that benefit all residents.',
    slug: 'general-fund',
  },
  {
    term: 'Homestead Exemption',
    definition:
      'A tax break for Florida residents who own and live in their primary home. It reduces the taxable value of your property by up to $50,000, lowering your annual property tax bill.',
    slug: 'homestead-exemption',
  },
  {
    term: 'Millage Rate',
    definition:
      'The tax rate applied to property values, expressed as dollars per $1,000 of assessed value. A millage rate of 5.0 means you pay $5 for every $1,000 your property is worth.',
    slug: 'millage-rate',
  },
  {
    term: 'Operating Budget',
    definition:
      'The day-to-day spending plan covering ongoing costs like employee salaries, utilities, supplies, and maintenance. This is what it costs to keep county services running each year.',
    slug: 'operating-budget',
  },
  {
    term: 'Strategic Area',
    definition:
      'One of nine broad categories the county uses to organize its departments and spending priorities, such as Public Safety, Transportation, and Neighborhood and Infrastructure.',
    slug: 'strategic-area',
  },
]
