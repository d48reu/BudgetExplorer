export default function StaffLoading() {
  return (
    <div className="-mb-16 min-h-screen bg-[#E9EDF0] px-4 py-12 md:-mt-16">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-8 w-48 bg-slate-300" />
        <div className="mt-8 h-40 bg-slate-300" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="h-64 bg-slate-200 lg:col-span-2" />
          <div className="h-64 bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
