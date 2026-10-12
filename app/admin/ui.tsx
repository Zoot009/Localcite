'use client'
import { useActionState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from './actions'

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null)
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" defaultValue={state?.email} className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      {state && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}

const TONES = { primary: 'btn-primary', plain: 'btn-outline', danger: 'btn-outline text-red-700 hover:bg-red-50' }

// A button in an admin row's form: it sends which action it is, is disabled while the form saves, and can ask first.
// Only `check` buttons run the form's checks (Approve needs a category picked; Reject and Delete don't).
export function Act({ intent, tone = 'plain', ask, check, children }: {
  intent: string; tone?: keyof typeof TONES; ask?: string; check?: boolean; children: ReactNode
}) {
  const { pending } = useFormStatus()
  return (
    <button
      name="intent" value={intent} disabled={pending} formNoValidate={!check}
      onClick={e => { if (ask && !window.confirm(ask)) e.preventDefault() }}
      className={`btn ${TONES[tone]} px-3 py-1.5`}
    >
      {children}
    </button>
  )
}
