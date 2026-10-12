import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

// Admin sign-in tokens (app/admin/auth.ts keeps one in an http-only cookie): "<expiry in ms>.<signature>".
// Only the server knows the key, so nobody can make a token or push its expiry back.
const sign = (key: string, exp: string) => createHmac('sha256', key).update(exp).digest('base64url')

export const makeToken = (key: string, exp: number) => `${exp}.${sign(key, String(exp))}`

export function validToken(key: string, token = '', now = Date.now()) {
  const parts = token.split('.')
  const [exp = '', sig = ''] = parts
  return parts.length === 2 && /^\d+$/.test(exp) && Number(exp) > now && sameText(sig, sign(key, exp))
}

// Compares in constant time, so the response time doesn't give away how much of a guess was right.
export const sameText = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
