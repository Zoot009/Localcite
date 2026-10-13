'use server'
import { randomBytes } from 'node:crypto'
import { refresh, revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { adminSql } from '@/lib/db'
import { slugify } from '@/lib/utils'
import { LISTING_RULES, check, websiteUrl } from '@/lib/validate'
import { requireAdmin, rightLogin, signIn, signOut } from './auth'

export type LoginState = { error: string; email: string } | null

export async function login(_: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get('email') ?? '')
  if (!rightLogin(email, String(fd.get('password') ?? ''))) {
    await new Promise(r => setTimeout(r, 1000)) // slows down password guessing
    return { error: 'Wrong email or password.', email }
  }
  await signIn()
  redirect('/admin')
}

export async function logout() {
  await signOut()
  redirect('/admin/login')
}

// Each row on the admin page is a form that sends its id and the button pressed (intent).
async function read(fd: FormData, intents: string[]) {
  await requireAdmin()
  const id = String(fd.get('id'))
  const intent = String(fd.get('intent'))
  if (!/^\d+$/.test(id) || !intents.includes(intent)) throw new Error('Unknown admin action')
  return { id, intent }
}

export async function reviewAction(fd: FormData) {
  const { id, intent } = await read(fd, ['hide', 'show', 'delete'])
  const [row] = intent === 'delete'
    ? await adminSql<{ business_id: string }>('delete from user_reviews where id = $1 returning business_id', [id])
    : await adminSql<{ business_id: string }>('update user_reviews set status = $2 where id = $1 returning business_id',
        [id, intent === 'hide' ? 'rejected' : 'approved'])
  if (row) updateTag(`reviews-${row.business_id}`) // the business page shows the change straight away
  refresh()
}

export async function claimAction(fd: FormData) {
  const { id, intent } = await read(fd, ['verified', 'rejected', 'delete'])
  if (intent === 'delete') await adminSql('delete from claim_requests where id = $1', [id])
  else await adminSql('update claim_requests set status = $2 where id = $1', [id, intent])
  refresh()
}

// Reject and publish only touch requests that aren't live yet; delete also takes a live one's business off the site.
export async function listingAction(fd: FormData) {
  const { id, intent } = await read(fd, ['publish', 'rejected', 'delete'])
  if (intent === 'delete') await remove(id)
  if (intent === 'rejected') await adminSql(`update listing_requests set status = 'rejected' where id = $1 and business_id is null`, [id])
  if (intent === 'publish') await publish(id, String(fd.get('category') ?? ''))
  refresh()
}

// Deletes a request, and its business with it if it was published (admin_remove_listing, a database function).
async function remove(id: string) {
  const [page] = await adminSql<{ path: string }>(
    `select '/' || ci.slug || '/' || c.slug path from listing_requests r
     join cities ci on ci.id = r.city_id join categories c on c.id = r.category_id where r.id = $1`,
    [id],
  )
  const [{ slug }] = await adminSql<{ slug: string | null }>('select admin_remove_listing($1) slug', [id])
  if (slug) {
    revalidatePath(`/biz/${slug}`) // gone from this website now; the others drop it when their pages refresh
    if (page) revalidatePath(page.path)
  }
}

// The details an admin can change on a business sent in through the form, published or not, checked like the form.
const EDIT_RULES = {
  name: LISTING_RULES.name, address: LISTING_RULES.address, phone: LISTING_RULES.phone,
  website: LISTING_RULES.website, description: LISTING_RULES.description,
}
export type EditState = { ok: boolean; message: string; values?: Record<string, string>; errors?: Record<string, string> } | null

export async function editListing(_: EditState, fd: FormData): Promise<EditState> {
  await requireAdmin()
  const id = String(fd.get('id'))
  if (!/^\d+$/.test(id)) throw new Error('Unknown listing')
  const values = Object.fromEntries(Object.keys(EDIT_RULES).map(k => [k, String(fd.get(k) ?? '').trim()]))
  const errors = check(EDIT_RULES, values)
  if (Object.keys(errors).length) return { ok: false, message: 'Please fix the highlighted fields.', values, errors }
  const [{ slug }] = await adminSql<{ slug: string | null }>(
    'select admin_edit_listing($1, $2, $3, $4, $5, $6) slug',
    [id, values.name, values.address, values.phone || null, websiteUrl(values.website), values.description || null],
  )
  if (slug) revalidatePath(`/biz/${slug}`) // shows on this website now; the others pick it up when their pages refresh
  refresh()
  return { ok: true, message: 'Saved.' }
}

// publish_listing_request (a database function) adds an approved or paid request to the site as a business.
// A request sent in with a category we don't list gets the one the admin picked.
async function publish(id: string, category: string) {
  const [r] = await adminSql<{ name: string }>(
    `update listing_requests set category_id = coalesce($2::bigint, category_id),
       status = case when status = 'paid' then 'paid' else 'approved' end
     where id = $1 and business_id is null returning name`,
    [id, /^\d+$/.test(category) ? category : null],
  )
  if (!r) return
  await adminSql('select publish_listing_request($1, $2)', [id, `${slugify(r.name) || 'business'}-${randomBytes(3).toString('hex')}`])
  // Its city's page for that category shows it now, not after the daily refresh.
  const [page] = await adminSql<{ path: string }>(
    `select '/' || ci.slug || '/' || c.slug path from listing_requests r
     join cities ci on ci.id = r.city_id join categories c on c.id = r.category_id where r.id = $1`,
    [id],
  )
  if (page) revalidatePath(page.path)
}
