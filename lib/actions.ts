'use server'
import { updateTag } from 'next/cache'
import { getBusiness, getCities } from './data'
import { insert, sql } from './db'
import { CLAIM_RULES, LISTING_RULES, MESSAGES, REVIEW_RULES, check, cityRule, matchCity, websiteUrl } from './validate'

// `errors` holds a message per field, shown under that field. The browser runs the same checks first (lib/validate.ts).
export type FormState = { ok: boolean; message: string; values?: Record<string, string>; errors?: Record<string, string> } | null

// Trimmed form text. The rules check lengths; this cap only stops oversized posts.
const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim().slice(0, 10_000)
const opt = (v: string) => v || null
const ROLES = new Set(['Owner', 'Manager', 'Employee', 'Agency or marketer'])
const RELATIONS = new Set(['owner', 'employee', 'customer'])

const invalid = (values: Record<string, string>, errors: Record<string, string>): FormState =>
  ({ ok: false, message: 'Please fix the highlighted fields.', values, errors })

// Submissions are saved to Supabase with an insert-only login (see insert in lib/db.ts) and checked by hand.
async function save(values: Record<string, string>, message: string, query: string, params: unknown[]): Promise<FormState> {
  try {
    await insert(query, params)
    return { ok: true, message }
  } catch (err) {
    console.error('[forms] submission not saved:', err)
    return { ok: false, message: 'Sorry, we couldn’t save that. Please try again later.', values }
  }
}

export async function submitReview(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, 'company')) return { ok: true, message: 'Thanks!' } // honeypot field only bots fill in
  const values = { text: str(fd, 'text'), name: str(fd, 'name'), email: str(fd, 'email') }
  const business = await getBusiness(str(fd, 'slug'))
  if (!business) return { ok: false, message: 'That business no longer exists.', values }
  const rating = Number(fd.get('rating'))
  const errors = check(REVIEW_RULES, values)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = MESSAGES.rating
  if (Object.keys(errors).length) return invalid(values, errors)
  const result = await save(values, 'Thanks! Your review is live.',
    'insert into user_reviews (business_id, rating, body, author_name, author_email) values ($1, $2, $3, $4, $5)',
    [business.key, rating, values.text, values.name, values.email])
  // Show it on the business page straight away (getSiteReviews in lib/data.ts is tagged with this).
  if (result?.ok) updateTag(`reviews-${business.key}`)
  return result
}

export async function submitBusiness(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, 'company')) return { ok: true, message: 'Thanks!' }
  const claim = str(fd, 'claim')

  if (claim) {
    const values = Object.fromEntries(['contact_name', 'role', 'email', 'phone', 'verify', 'note'].map(k => [k, str(fd, k)]))
    const business = await getBusiness(claim)
    if (!business) return { ok: false, message: 'That business no longer exists.', values }
    const errors = check(CLAIM_RULES, values)
    if (fd.get('confirm') !== 'on') errors.confirm = MESSAGES.confirm
    if (Object.keys(errors).length) return invalid(values, errors)
    const byEmail = values.verify === 'email'
    return save(values, byEmail ? 'Claim received! We’ll email you to confirm it’s you.' : 'Claim received! We’ll call the business to confirm it’s you.',
      'insert into claim_requests (business_id, contact_name, role, email, phone, verify_by, note) values ($1, $2, $3, $4, $5, $6, $7)',
      [business.key, values.contact_name, ROLES.has(values.role) ? values.role : 'Owner', values.email, values.phone, byEmail ? 'email' : 'phone', opt(values.note)])
  }

  const keys = ['name', 'category', 'address', 'area', 'city', 'phone', 'website', 'hours', 'description', 'contact_name', 'email', 'relationship']
  const values = Object.fromEntries(keys.map(k => [k, str(fd, k)]))
  const cities = await getCities()
  const errors = check({ ...LISTING_RULES, city: cityRule(cities) }, values)
  if (Object.keys(errors).length) return invalid(values, errors)
  // A category we list is saved by id. Anything else is kept as typed, and we pick the nearest category when we review it.
  let category: { id: string } | undefined
  try {
    ;[category] = await sql<{ id: string }>('select id from categories where lower(name) = lower($1)', [values.category])
  } catch (err) {
    console.error('[forms] category lookup failed:', err)
    return { ok: false, message: 'Sorry, we couldn’t save that. Please try again later.', values }
  }
  return save(values, 'Thanks! We’ll check your listing by hand and publish it, usually within a few days.',
    `insert into listing_requests (plan, name, category_id, other_category, city_id, address, area, phone, website, hours, description,
       submitter_name, submitter_email, relation)
     values ('free', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      values.name, category?.id ?? null, category ? null : values.category, matchCity(cities, values.city)!.id, values.address, opt(values.area),
      opt(values.phone), websiteUrl(values.website), opt(values.hours), opt(values.description), values.contact_name, values.email,
      RELATIONS.has(values.relationship) ? values.relationship : 'owner',
    ])
}
