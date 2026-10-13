'use client'
import { useActionState, useId, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { editListing, login } from './actions'

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

type ListingDetails = Record<'name' | 'address' | 'phone' | 'website' | 'description', string>

// Opens under a listing (native <details>, no script) to change its details, live on the site or not yet published.
export function EditListing({ id, values }: { id: string; values: ListingDetails }) {
  const [state, action, pending] = useActionState(editListing, null)
  const v = { ...values, ...state?.values }
  const errors = state?.errors ?? {}
  return (
    <details className="mt-3">
      <summary className="inline-flex cursor-pointer text-sm font-semibold text-brand-700 hover:underline">Edit details</summary>
      <form action={action} className="mt-3 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={id} />
        <EditField label="Business name" name="name" value={v.name} error={errors.name} />
        <EditField label="Address" name="address" value={v.address} error={errors.address} />
        <EditField label="Phone" name="phone" value={v.phone} error={errors.phone} />
        <EditField label="Website" name="website" value={v.website} error={errors.website} />
        <EditField label="Description" name="description" value={v.description} error={errors.description} textarea />
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className="btn btn-primary px-3 py-1.5">{pending ? 'Saving…' : 'Save changes'}</button>
          {state && <p role="status" className={`text-sm ${state.ok ? 'text-emerald-700' : 'text-red-700'}`}>{state.message}</p>}
        </div>
      </form>
    </details>
  )
}

function EditField({ label, name, value, error, textarea }: { label: string; name: string; value: string; error?: string; textarea?: boolean }) {
  const id = useId()
  const props = {
    id, name, defaultValue: value, className: 'input', 'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
  return (
    <div className={textarea ? 'sm:col-span-2' : undefined}>
      <label htmlFor={id} className="label">{label}</label>
      {textarea ? <textarea rows={3} {...props} /> : <input {...props} />}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}
