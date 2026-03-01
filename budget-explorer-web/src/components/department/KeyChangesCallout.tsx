type KeyChangesCalloutProps = {
  keyChanges: string
  areaColor: string | null
}

export function KeyChangesCallout({
  keyChanges,
  areaColor,
}: KeyChangesCalloutProps) {
  const borderColor = areaColor ?? '#0057B8'

  return (
    <div
      className="rounded-md bg-surface-secondary px-4 py-3"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
        Key Changes
      </p>
      <p className="text-sm text-text-primary leading-relaxed">{keyChanges}</p>
    </div>
  )
}
