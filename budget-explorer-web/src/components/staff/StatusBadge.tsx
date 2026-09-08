import clsx from 'clsx'

const labels: Record<string, string> = {
  verified: 'Verified',
  reported: 'Reported',
  pending: 'Pending evidence',
  conflicting: 'Conflicting sources',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 border px-2.5 py-1 text-xs font-black uppercase tracking-[0.08em]',
        status === 'verified' && 'border-emerald-700 bg-emerald-50 text-emerald-900',
        status === 'reported' && 'border-blue-700 bg-blue-50 text-blue-900',
        status === 'pending' && 'border-amber-700 bg-amber-50 text-amber-950',
        status === 'conflicting' && 'border-red-700 bg-red-50 text-red-900'
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'h-2 w-2 rounded-full',
          status === 'verified' && 'bg-emerald-600',
          status === 'reported' && 'bg-blue-600',
          status === 'pending' && 'bg-amber-500',
          status === 'conflicting' && 'bg-red-600'
        )}
      />
      {labels[status] ?? status}
    </span>
  )
}
