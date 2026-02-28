/**
 * Dollar formatting utilities for budget data.
 * All monetary values in the database are stored as BigInt cents.
 * These functions convert cents (as string or number) to display formats.
 */

/**
 * Format cents to abbreviated dollar display.
 * Examples:
 *   1_323_323_800_000 -> "$13.2B"
 *   857_560_600_000   -> "$8.6B"
 *   150_000_000       -> "$1.5M"
 *   250_000           -> "$2.5K"
 *   5_000             -> "$50"
 */
export function formatDollarsAbbreviated(cents: string | number): string {
  const dollars = Number(cents) / 100

  if (dollars >= 1_000_000_000) {
    return `$${(dollars / 1_000_000_000).toFixed(1)}B`
  }
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1)}M`
  }
  if (dollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(1)}K`
  }
  return `$${dollars.toFixed(0)}`
}

/**
 * Format cents to full dollar display with commas.
 * Example: 1_323_323_800_000 -> "$13,233,238,000"
 */
export function formatDollarsFull(cents: string | number): string {
  const dollars = Math.round(Number(cents) / 100)
  return `$${dollars.toLocaleString('en-US')}`
}

/**
 * Format year-over-year percentage change.
 * Returns { value: "+5.2%", direction: "increase" | "decrease" | "unchanged" }
 *
 * Color convention per user requirements:
 *   - Increases: blue (#0057B8) -- neutral, not "good"
 *   - Decreases: orange (#F7941D) -- neutral, not "bad"
 */
export function formatYoYChange(
  currentCents: string | number,
  priorCents: string | number
): { value: string; direction: 'increase' | 'decrease' | 'unchanged' } {
  const current = Number(currentCents)
  const prior = Number(priorCents)

  if (prior === 0) return { value: 'N/A', direction: 'unchanged' }

  const pctChange = ((current - prior) / prior) * 100

  if (Math.abs(pctChange) < 0.05) {
    return { value: '0.0%', direction: 'unchanged' }
  }

  return {
    value: `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%`,
    direction: pctChange > 0 ? 'increase' : 'decrease',
  }
}
