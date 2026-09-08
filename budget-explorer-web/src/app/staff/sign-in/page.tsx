import Link from 'next/link'
import { redirect } from 'next/navigation'
import { StaffSignInForm } from '@/components/staff/StaffSignInForm'
import { getStaffSession, staffAuthConfigured } from '@/lib/staff-auth'

export const dynamic = 'force-dynamic'

export default async function StaffSignInPage() {
  if (await getStaffSession()) redirect('/staff')
  const configured = staffAuthConfigured()

  return (
    <div className="-mb-16 min-h-[calc(100vh-4rem)] bg-[#E9EDF0] px-4 py-12 md:-mt-16 md:min-h-screen md:py-20">
      <div className="mx-auto grid max-w-5xl overflow-hidden border border-slate-950 bg-white shadow-[10px_10px_0_#0f172a] md:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-slate-950 p-7 text-white sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-300">
            Budget Explorer · Staff
          </p>
          <h1 className="mt-8 font-heading text-4xl font-black tracking-[-0.04em] sm:text-5xl">
            Evidence before talking points.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            Prepare meetings, test outside claims against County sources, and keep follow-up work in one place.
          </p>
          <div className="mt-10 border-t border-slate-700 pt-6 text-sm leading-6 text-slate-400">
            Internal working material. Nothing here is automatically published to the public site.
          </div>
        </section>
        <section className="p-7 sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-mdc-blue">Restricted</p>
              <h2 className="mt-2 font-heading text-3xl font-black tracking-[-0.03em]">Staff access</h2>
            </div>
            <Link href="/" className="text-sm font-bold text-slate-600 underline underline-offset-4">
              Public site
            </Link>
          </div>
          {configured ? (
            <StaffSignInForm />
          ) : (
            <p className="mt-8 border-l-4 border-amber-600 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
              Staff access has not been configured for this environment.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
