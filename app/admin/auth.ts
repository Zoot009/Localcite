import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { makeToken, sameText, validToken } from '@/lib/session'

// The admin login comes from env vars (.env.local here, the host's settings on the live site), never from the code.
// Sign-ins are signed with the server's secret plus that login, so changing the password signs everyone out.
const COOKIE = 'admin_session'
const DAYS = 7

function signingKey() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET } = process.env
  return ADMIN_EMAIL && ADMIN_PASSWORD && ADMIN_SESSION_SECRET ? [ADMIN_SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD].join('\n') : null
}

export function rightLogin(email: string, password: string) {
  const { ADMIN_EMAIL = '', ADMIN_PASSWORD = '' } = process.env
  if (!signingKey()) {
    console.error('[admin] Sign-in is off: set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_SESSION_SECRET')
    return false
  }
  const emailOk = sameText(email.trim().toLowerCase(), ADMIN_EMAIL.trim().toLowerCase())
  const passwordOk = sameText(password, ADMIN_PASSWORD)
  return emailOk && passwordOk
}

export async function signIn() {
  ;(await cookies()).set(COOKIE, makeToken(signingKey()!, Date.now() + DAYS * 86_400_000), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/admin', maxAge: DAYS * 86_400,
  })
}

export async function signOut() {
  ;(await cookies()).delete({ name: COOKIE, path: '/admin' })
}

// Every admin page and action calls this first. Anyone can call a Server Action, so each one checks for itself.
export async function requireAdmin() {
  await connection() // the check reads the clock (the sign-in's expiry), so it only ever runs for a real request
  const key = signingKey()
  if (!key || !validToken(key, (await cookies()).get(COOKIE)?.value)) redirect('/admin/login')
}
