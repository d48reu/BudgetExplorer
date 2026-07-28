import { formatDollarsAbbreviated, formatYoYChange } from '@/lib/format'

type KeyChangesCalloutProps = {
  currentFiscalYear: string
  currentOperating: string
  priorFiscalYear: string
  priorOperating: string
  areaColor: string | null
}

export function KeyChangesCallout({
  currentFiscalYear,
  currentOperating,
  priorFiscalYear,
  priorOperating,
  areaColor,
}: KeyChangesCalloutProps) {
  const borderColor = areaColor ?? '#0057B8'
  const change = formatYoYChange(currentOperating, priorOperating)
  const delta = Number(currentOperating) - Number(priorOperating)
  const direction =
    delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'was unchanged'
  const changeText =
    delta === 0
      ? `Operating spending was unchanged at ${formatDollarsAbbreviated(currentOperating)} in ${currentFiscalYear}.`
      : `Operating spending ${direction} from ${formatDollarsAbbreviated(priorOperating)} in ${priorFiscalYear} to ${formatDollarsAbbreviated(currentOperating)} in ${currentFiscalYear}: ${delta > 0 ? '+' : '−'}${formatDollarsAbbreviated(Math.abs(delta))} (${change.value}).`

  return (
    <div
      className="border-y border-text-primary py-4 pl-5"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
        Operating change
      </p>
      <p className="text-sm text-text-primary leading-relaxed">{changeText}</p>
    </div>
  )
}
