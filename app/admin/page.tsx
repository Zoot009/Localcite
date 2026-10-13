import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { Logo, Wordmark } from '@/components/icons'
import { Stars } from '@/components/ui'
import { adminSql } from '@/lib/db'
import { cap, formatDate, one, safeUrl, telHref } from '@/lib/utils'
import { claimAction, listingAction, logout, reviewAction } from './actions'
import { requireAdmin } from './auth'
import { Badge, Empty, pageHref, type Tone } from './parts'
import { Act, EditListing } from './ui'
import { Websites } from './websites'

export const metadata: Metadata = { title: 'Admin' }

const TABS = [
  { key: 'listings', label: 'Listings' },
  { key: 'claims', label: 'Claims' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'websites', label: 'Websites' },
] as const
type Tab = (typeof TABS)[number]['key']

// ponytail: newest 200 per tab, add paging when a tab outgrows that.
const LIMIT = 200

// The website each business lives on, so its links open there (see pageHref).
const SITE_OF = `left join business_sites bs on bs.business_id = b.id left join sites st on st.id = bs.site_id`
const bizHref = (slug: string, domain: string | null) => pageHref(domain, `/biz/${slug}`)

export default function AdminPage({ searchParams }: PageProps<'/admin'>) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Panel searchParams={searchParams} />
    </Suspense>
  )
}

async function Panel({ searchParams }: Pick<PageProps<'/admin'>, 'searchParams'>) {
  await requireAdmin()
  const sp = await searchParams
  const asked = one(sp.tab)
  const tab: Tab = TABS.find(t => t.key === asked)?.key ?? 'listings'
  let counts: Record<Tab, string>
  try {
    ;[counts] = await adminSql<Record<Tab, string>>(
      `select (select count(*) from listing_requests) listings, (select count(*) from claim_requests) claims,
         (select count(*) from user_reviews) reviews, (select count(*) from sites) websites`,
    )
  } catch (err) {
    // On a new server this is nearly always the admin database login, missing or mistyped: say so instead of failing.
    console.error('[admin] database not reachable:', err)
    return <NoDatabase error={(err as Error).message} />
  }
  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 text-lg"><Logo /><span className="max-sm:hidden"><Wordmark /></span></Link>
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-white">Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="btn btn-outline px-3 py-1.5 max-sm:hidden">View site</Link>
            <form action={logout}><button type="submit" className="btn btn-outline px-3 py-1.5">Sign out</button></form>
          </div>
        </div>
        <nav aria-label="Admin sections" className="mx-auto flex max-w-5xl gap-6 px-4">
          {TABS.map(t => (
            <Link
              key={t.key} href={`/admin?tab=${t.key}`} aria-current={t.key === tab ? 'page' : undefined}
              className="-mb-px flex items-center gap-2 border-b-2 border-transparent py-3 text-sm font-semibold text-zinc-500 hover:text-zinc-900 aria-[current=page]:border-brand-600 aria-[current=page]:text-zinc-900"
            >
              {t.label}<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 max-sm:hidden">{counts[t.key]}</span>
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {tab === 'websites' ? <Websites site={one(sp.site)} type={one(sp.type)} q={one(sp.q)} page={one(sp.page)} />
          : tab === 'listings' ? <Listings /> : tab === 'claims' ? <Claims /> : <Reviews />}
      </main>
    </>
  )
}

// ---------- the three lists ----------

type ListingRow = {
  id: string; created_at: Date; plan: string; status: string; name: string; category_id: string | null; category: string | null
  other_category: string | null; city: string; address: string; area: string | null; phone: string | null; website: string | null
  hours: string | null; description: string | null; submitter_name: string; submitter_email: string; relation: string; slug: string | null
  domain: string | null
}

const LISTING_STATUS: Record<string, [string, Tone]> = {
  pending: ['New', 'new'], awaiting_payment: ['Awaiting payment', 'info'], paid: ['Paid', 'new'],
  approved: ['Approved', 'info'], published: ['Published', 'good'], rejected: ['Rejected', 'bad'],
}

async function Listings() {
  const rows = await adminSql<ListingRow>(
    `select r.id, r.created_at, r.plan, r.status, r.name, r.category_id, c.name category, r.other_category,
       ci.name || ', ' || upper(ci.country_code) city, r.address, r.area, r.phone, r.website, r.hours, r.description,
       r.submitter_name, r.submitter_email, r.relation, b.slug, st.domain
     from listing_requests r join cities ci on ci.id = r.city_id left join categories c on c.id = r.category_id
       left join businesses b on b.id = r.business_id ${SITE_OF}
     order by r.created_at desc limit ${LIMIT}`,
  )
  if (!rows.length) return <Empty>No businesses sent in yet.</Empty>
  // Only needed to pick a category for a request sent in with one we don't list.
  const categories = rows.some(r => !r.category_id && !r.slug)
    ? await adminSql<{ id: string; name: string }>('select id, name from categories order by name')
    : []
  return (
    <ul className="space-y-4">
      {rows.map(r => {
        const [label, tone] = LISTING_STATUS[r.status] ?? [r.status, 'info']
        const website = safeUrl(r.website ?? undefined)
        return (
          <Card key={r.id} title={r.name} href={r.slug ? bizHref(r.slug, r.domain) : undefined} badge={<Badge tone={tone}>{label}</Badge>}>
            <p className="mt-1 text-sm text-zinc-600">
              {r.category ? cap(r.category) : `“${r.other_category}” (not a category we list)`} · {r.area ? `${r.area}, ` : ''}{r.city} ·{' '}
              {r.plan === 'paid' ? 'Paid' : 'Free'} listing · {formatDate(r.created_at.toISOString())}
              {r.domain && <> · on {r.domain}</>}
            </p>
            <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              <Info label="Address">{r.address}</Info>
              {r.phone && <Info label="Phone"><a href={telHref(r.phone)} className="hover:underline">{r.phone}</a></Info>}
              {r.website && <Info label="Website">{website ? <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline">{r.website}</a> : r.website}</Info>}
              {r.hours && <Info label="Hours">{r.hours}</Info>}
              <Info label="Sent by">{r.submitter_name} ({cap(r.relation)}), <Mail to={r.submitter_email} /></Info>
            </dl>
            {r.description && <p className="mt-3 text-sm whitespace-pre-line text-zinc-700">{r.description}</p>}
            <form action={listingAction} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              {r.slug ? (
                <Link href={bizHref(r.slug, r.domain)} className="btn btn-outline px-3 py-1.5">View on {r.domain ?? 'site'}</Link>
              ) : (
                <>
                  {!r.category_id && (
                    <select name="category" required aria-label="Category to list it under" defaultValue="" className="input w-auto py-1.5">
                      <option value="" disabled>List it under…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  <Act intent="publish" tone="primary" check>Approve & publish</Act>
                  {r.status !== 'rejected' && <Act intent="rejected">Reject</Act>}
                </>
              )}
              <Act intent="delete" tone="danger" ask={r.slug
                ? `Delete ${r.name}? Its page comes off ${r.domain ?? 'the site'} too. This can’t be undone.`
                : `Delete the request for ${r.name}? This can’t be undone.`}>Delete</Act>
            </form>
            <EditListing id={r.id} values={{ name: r.name, address: r.address, phone: r.phone ?? '', website: r.website ?? '', description: r.description ?? '' }} />
          </Card>
        )
      })}
    </ul>
  )
}

type ClaimRow = {
  id: string; created_at: Date; status: string; contact_name: string; role: string; email: string; phone: string
  verify_by: string; note: string | null; title: string; slug: string; domain: string | null
}

const CLAIM_STATUS: Record<string, [string, Tone]> = { pending: ['New', 'new'], verified: ['Verified', 'good'], rejected: ['Rejected', 'bad'] }

async function Claims() {
  const rows = await adminSql<ClaimRow>(
    `select r.id, r.created_at, r.status, r.contact_name, r.role, r.email, r.phone, r.verify_by, r.note, b.title, b.slug, st.domain
     from claim_requests r join businesses b on b.id = r.business_id ${SITE_OF} order by r.created_at desc limit ${LIMIT}`,
  )
  if (!rows.length) return <Empty>No claims yet.</Empty>
  return (
    <ul className="space-y-4">
      {rows.map(r => {
        const [label, tone] = CLAIM_STATUS[r.status] ?? [r.status, 'info']
        return (
          <Card key={r.id} title={r.title} href={bizHref(r.slug, r.domain)} badge={<Badge tone={tone}>{label}</Badge>}>
            <p className="mt-1 text-sm text-zinc-600">Claimed by {r.contact_name} ({r.role}) · {formatDate(r.created_at.toISOString())}{r.domain && <> · on {r.domain}</>}</p>
            <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              <Info label="Email"><Mail to={r.email} /></Info>
              <Info label="Phone"><a href={telHref(r.phone)} className="hover:underline">{r.phone}</a></Info>
              <Info label="Confirm by">{r.verify_by === 'email' ? 'Email' : 'Phone call to the business'}</Info>
            </dl>
            {r.note && <p className="mt-3 text-sm whitespace-pre-line text-zinc-700">{r.note}</p>}
            <form action={claimAction} className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={r.id} />
              {r.status !== 'verified' && <Act intent="verified" tone="primary">Mark verified</Act>}
              {r.status !== 'rejected' && <Act intent="rejected">Reject</Act>}
              <Act intent="delete" tone="danger" ask="Delete this claim? This can’t be undone.">Delete</Act>
            </form>
          </Card>
        )
      })}
    </ul>
  )
}

type ReviewRow = {
  id: string; created_at: Date; status: string; rating: number; body: string; author_name: string; author_email: string; title: string; slug: string
  domain: string | null
}

async function Reviews() {
  const rows = await adminSql<ReviewRow>(
    `select r.id, r.created_at, r.status, r.rating, r.body, r.author_name, r.author_email, b.title, b.slug, st.domain
     from user_reviews r join businesses b on b.id = r.business_id ${SITE_OF} order by r.created_at desc limit ${LIMIT}`,
  )
  if (!rows.length) return <Empty>No reviews yet.</Empty>
  return (
    <ul className="space-y-4">
      {rows.map(r => {
        // Reviews go live as soon as they're written; hiding one marks it rejected.
        const hidden = r.status === 'rejected'
        return (
          <Card key={r.id} title={r.title} href={`${bizHref(r.slug, r.domain)}#reviews`} badge={<Badge tone={hidden ? 'bad' : 'good'}>{hidden ? 'Hidden' : 'Live'}</Badge>}>
            <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500"><Stars rating={r.rating} size={15} /> {formatDate(r.created_at.toISOString())}{r.domain && <> · on {r.domain}</>}</div>
            <p className="mt-2 whitespace-pre-line text-zinc-800">{r.body}</p>
            <p className="mt-2 text-sm text-zinc-600">{r.author_name}, <Mail to={r.author_email} /></p>
            <form action={reviewAction} className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={r.id} />
              {hidden ? <Act intent="show">Show again</Act> : <Act intent="hide">Hide</Act>}
              <Act intent="delete" tone="danger" ask="Delete this review? This can’t be undone.">Delete</Act>
            </form>
          </Card>
        )
      })}
    </ul>
  )
}

// ---------- pieces ----------

function Card({ title, href, badge, children }: { title: string; href?: string; badge: ReactNode; children: ReactNode }) {
  return (
    <li className="card p-5">
      <div className="flex items-start justify-between gap-3">
        {href ? <Link href={href} className="font-semibold hover:text-brand-700 hover:underline">{title}</Link> : <p className="font-semibold">{title}</p>}
        {badge}
      </div>
      {children}
    </li>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-zinc-500">{label}</dt>
      <dd className="min-w-0 wrap-anywhere text-zinc-800">{children}</dd>
    </div>
  )
}

const Mail = ({ to }: { to: string }) => <a href={`mailto:${to}`} className="text-brand-700 hover:underline">{to}</a>

function NoDatabase({ error }: { error: string }) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
      <div className="card p-8">
        <h1 className="text-xl font-bold tracking-tight">The admin panel can’t reach its database</h1>
        <p className="mt-3 text-zinc-700">
          Add <code className="font-mono text-sm">WEB_ADMIN_DATABASE_URL</code> to this server’s environment variables, with
          the value from <code className="font-mono text-sm">.env.local</code>. On Vercel: Settings → Environment Variables,
          for Production. Then redeploy, so the new value is used.
        </p>
        <p className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs wrap-anywhere text-zinc-700">{error}</p>
        <form action={logout} className="mt-6"><button type="submit" className="btn btn-outline">Sign out</button></form>
      </div>
    </main>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-24">
      {[0, 1, 2].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-200/60" />)}
    </div>
  )
}
