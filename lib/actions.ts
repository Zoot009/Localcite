'use server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getBusiness } from './data'

export type FormState = { ok: boolean; message: string; values?: Record<string, string> } | null

const str = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? '').trim().slice(0, max)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LABELS: Record<string, string> = { name: 'the business name', category: 'a category', address: 'the address', city: 'the city', contact_name: 'your name', email: 'your email', phone: 'a phone number' }

// ponytail: appends to submissions/*.jsonl on local disk; serverless hosts (Vercel etc.) have read-only disks,
// so swap this for a database before deploying there.
async function save(file: string, entry: object) {
  const dir = path.join(process.cwd(), 'submissions')
  await fs.mkdir(dir, { recursive: true })
  await fs.appendFile(path.join(dir, file), JSON.stringify({ ...entry, submitted_at: new Date().toISOString() }) + '\n')
}

export async function submitReview(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, 'company')) return { ok: true, message: 'Thanks!' } // honeypot field only bots fill in
  const values = { text: str(fd, 'text', 5000), name: str(fd, 'name', 80), email: str(fd, 'email', 120) }
  const business = await getBusiness(str(fd, 'slug'))
  const rating = Number(fd.get('rating'))
  const error = !business ? 'That business no longer exists.'
    : !Number.isInteger(rating) || rating < 1 || rating > 5 ? 'Choose a star rating.'
    : values.text.length < 50 ? 'Your review needs at least 50 characters.'
    : !values.name ? 'Add your name.'
    : !EMAIL.test(values.email) ? 'Enter a valid email address.'
    : ''
  if (error) return { ok: false, message: error, values }
  try {
    await save('reviews.jsonl', { business: business!.slug, rating, ...values })
    return { ok: true, message: 'Thanks! Your review will appear once it has been checked.' }
  } catch {
    return { ok: false, message: 'Sorry, we couldn’t save your review. Please try again later.', values }
  }
}

export async function submitBusiness(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, 'company')) return { ok: true, message: 'Thanks!' }
  const claim = str(fd, 'claim')
  const long = new Set(['description', 'hours', 'note'])
  const keys = claim
    ? ['contact_name', 'role', 'email', 'phone', 'verify', 'note']
    : ['name', 'category', 'address', 'area', 'city', 'phone', 'website', 'hours', 'description', 'contact_name', 'email', 'relationship']
  const values = Object.fromEntries(keys.map(k => [k, str(fd, k, long.has(k) ? 2000 : 200)]))
  const missing = (claim ? ['contact_name', 'email', 'phone'] : ['name', 'category', 'address', 'city', 'contact_name', 'email']).find(k => !values[k])
  const error = claim && !(await getBusiness(claim)) ? 'That business no longer exists.'
    : missing ? `Please add ${LABELS[missing]}.`
    : !EMAIL.test(values.email) ? 'Enter a valid email address.'
    : values.website && !/^https?:\/\/\S+\.\S+/i.test(values.website) ? 'The website should start with http:// or https://'
    : claim && fd.get('confirm') !== 'on' ? 'Please confirm you’re authorised to manage this business.'
    : ''
  if (error) return { ok: false, message: error, values }
  try {
    await save(claim ? 'claims.jsonl' : 'businesses.jsonl', claim ? { business: claim, ...values } : values)
    return {
      ok: true,
      message: claim ? 'Thanks! We’ll contact you to verify that you manage this business.' : 'Thanks! We’ll review the details and publish the listing once it’s verified.',
    }
  } catch {
    return { ok: false, message: 'Sorry, we couldn’t save that. Please try again later.', values }
  }
}
