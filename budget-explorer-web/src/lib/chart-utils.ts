/**
 * Chart utility functions for converting budget data to chart-safe values.
 *
 * All monetary values in the database are stored as BigInt cents and
 * serialized to strings for JSON transport. D3 and Recharts require
 * plain numbers, so these utilities handle the conversion.
 */

/**
 * Convert BigInt cents (stored as string) to a Number for chart libraries.
 * D3 and Recharts require plain numbers, not strings.
 *
 * @warning JavaScript Number loses precision above Number.MAX_SAFE_INTEGER (2^53).
 * Max safe value as dollars: $90,071,992,547,409.91 -- well above any county budget.
 * Miami-Dade's total budget is ~$13.2B, so this is safe.
 */
export function toChartValue(centsString: string): number {
  return Number(centsString)
}

/**
 * Convert cents string to dollar amount for display in chart labels.
 * Example: "857560600000" -> 8575606000
 */
export function centsToDollars(centsString: string): number {
  return Number(centsString) / 100
}

/**
 * Format a decimal value as a percentage string.
 * Example: formatPercentage(42.3456, 1) -> "42.3%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}
