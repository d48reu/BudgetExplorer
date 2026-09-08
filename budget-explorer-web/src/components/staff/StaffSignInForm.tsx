'use client'

import { useActionState } from 'react'
import { signInAction, type SignInState } from '@/app/staff/actions'
import { STAFF_ROLES } from '@/lib/staff-types'

const initialState: SignInState = { error: null }

export function StaffSignInForm() {
  const [state, action, pending] = useActionState(signInAction, initialState)

  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="staff-name" className="block text-sm font-bold text-slate-800">
          Your name
        </label>
        <input
          id="staff-name"
          name="name"
          autoComplete="name"
          required
          className="mt-2 w-full border border-slate-400 bg-white px-3 py-3 text-base shadow-sm"
        />
      </div>
      <div>
        <label htmlFor="staff-role" className="block text-sm font-bold text-slate-800">
          Office role
        </label>
        <select
          id="staff-role"
          name="role"
          required
          defaultValue=""
          className="mt-2 w-full border border-slate-400 bg-white px-3 py-3 text-base shadow-sm"
        >
          <option value="" disabled>Select a role</option>
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="staff-code" className="block text-sm font-bold text-slate-800">
          Office access code
        </label>
        <input
          id="staff-code"
          name="accessCode"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full border border-slate-400 bg-white px-3 py-3 text-base shadow-sm"
        />
      </div>
      {state.error && (
        <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-slate-950 px-4 py-3 text-base font-black text-white hover:bg-mdc-blue disabled:cursor-wait disabled:bg-slate-500"
      >
        {pending ? 'Checking access…' : 'Open staff workspace'}
      </button>
    </form>
  )
}
