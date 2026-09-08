'use client'

export default function StaffError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="-mb-16 min-h-screen bg-[#E9EDF0] px-4 py-16 md:-mt-16">
      <div className="mx-auto max-w-xl border border-slate-950 bg-white p-8 shadow-[8px_8px_0_#0f172a]">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-red-700">Workspace unavailable</p>
        <h1 className="mt-3 font-heading text-3xl font-black">The staff research desk could not be loaded.</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">No public budget data was changed. Try the request again.</p>
        <button onClick={reset} className="mt-6 bg-slate-950 px-4 py-3 font-bold text-white hover:bg-mdc-blue">
          Try again
        </button>
      </div>
    </div>
  )
}
