import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { adminSql } from '@/lib/db'
import { MIN_AREA_LISTINGS, MIN_CATEGORY_LISTINGS } from '@/lib/site'
import { Badge, Empty, pageHref, siteUrl, type Tone } from './parts'

// The Websites tab: every website sharing the database, how many pages each has, and a browser for them. All five
// sites use the same page addresses and rules, so their pages are worked out here the way each builds its sitemap:
// every city, each city + category list with 5+ of the website's businesses, each area list with 3+, every business.

type Site = { id: number; domain: string; businesses: number; lists: number; areas: number; cities: number }
type Row = { label: string; sub: string; path: string; n: number | null; total: number }

const TYPES = [
  { key: 'biz', label: 'Business pages', count: (s: Site) => s.businesses },
  { key: 'lists', label: 'Type in city', count: (s: Site) => s.lists },
  { key: 'areas', label: 'Area pages', count: (s: Site) => s.areas },
  { key: 'cities', label: 'City pages', count: (s: Site) => s.cities },
] as const
type PageType = (typeof TYPES)[number]['key']
const PER_PAGE = 50
const n = (x: number) => x.toLocaleString('en-US')
const pageCount = (s: Site) => TYPES.reduce((sum, t) => sum + t.count(s), 0)

// Counted in one go and kept for an hour: a business moved to another website shows in these numbers within the hour.
async function siteStats(): Promise<Site[]> {
  'use cache'
  cacheLife('hours')
  return adminSql<Site>(
    `with lists as (select bs.site_id, count(*) n from business_categories bc join business_sites bs using (business_id)
                    group by bs.site_id, bc.city_id, bc.category_id),
          areas as (select bs.site_id, count(*) n from business_categories bc join businesses b on b.id = bc.business_id
                    join business_sites bs on bs.business_id = bc.business_id where b.area_slug is not null
                    group by bs.site_id, bc.city_id, bc.category_id, b.area_slug)
     select s.id, s.domain,
       (select count(*) from business_sites x where x.site_id = s.id)::int businesses,
       (select count(*) from lists l where l.site_id = s.id and l.n >= $1)::int lists,
       (select count(*) from areas a where a.site_id = s.id and a.n >= $2)::int areas,
       (select count(*) from cities)::int cities
     from sites s order by s.id`,
    [MIN_CATEGORY_LISTINGS, MIN_AREA_LISTINGS],
  )
}

// Whether a website answers. Vercel answers 402 when it has switched a project off (usage limit or an unpaid bill).
async function siteStatus(domain: string): Promise<number> {
  'use cache'
  try {
    const { status } = await fetch(`${siteUrl(domain)}/`, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
    cacheLife('minutes')
    return status
  } catch (err) {
    cacheLife('seconds') // a network blip shouldn't show a site as down for minutes
    console.warn(`[admin] ${domain} didn't answer:`, (err as Error).cause ?? err)
    return 0
  }
}

function StatusBadge({ code }: { code: number }) {
  const [label, tone]: [string, Tone] = code >= 200 && code < 400 ? ['Live', 'good']
    : code === 402 ? ['Switched off by Vercel', 'bad'] : code ? [`Error ${code}`, 'bad'] : ['Not answering', 'bad']
  return <Badge tone={tone}>{label}</Badge>
}

// One page (50) of a website's pages of one type: by name, or most-reviewed first for businesses.
async function sitePages(site: number, type: PageType, q: string, page: number): Promise<Row[]> {
  const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`
  const offset = (page - 1) * PER_PAGE
  const label = `upper(left(c.name, 1)) || substr(c.name, 2)`
  switch (type) {
    case 'biz':
      return adminSql<Row>(
        `select b.title label, ci.name sub, '/biz/' || b.slug path, null::int n, (count(*) over ())::int total
         from business_sites bs join businesses b on b.id = bs.business_id join cities ci on ci.id = b.city_id
         where bs.site_id = $1 and ($2 = '' or b.title ilike $3 or ci.name ilike $3)
         order by b.review_count desc nulls last, b.id limit ${PER_PAGE} offset $4`,
        [site, q, like, offset],
      )
    case 'lists':
      return adminSql<Row>(
        `select ${label} || ' in ' || ci.name label, '' sub, '/' || ci.slug || '/' || c.slug path,
           count(*)::int n, (count(*) over ())::int total
         from business_categories bc join business_sites bs using (business_id)
           join cities ci on ci.id = bc.city_id join categories c on c.id = bc.category_id
         where bs.site_id = $1 and ($2 = '' or ci.name ilike $3 or c.name ilike $3)
         group by ci.id, c.id having count(*) >= $5
         order by ci.name, c.name limit ${PER_PAGE} offset $4`,
        [site, q, like, offset, MIN_CATEGORY_LISTINGS],
      )
    case 'areas':
      return adminSql<Row>(
        `select ${label} || ' in ' || min(b.area) label, ci.name sub, '/' || ci.slug || '/' || c.slug || '/' || b.area_slug path,
           count(*)::int n, (count(*) over ())::int total
         from business_categories bc join businesses b on b.id = bc.business_id
           join business_sites bs on bs.business_id = bc.business_id
           join cities ci on ci.id = bc.city_id join categories c on c.id = bc.category_id
         where bs.site_id = $1 and b.area_slug is not null and ($2 = '' or ci.name ilike $3 or c.name ilike $3 or b.area ilike $3)
         group by ci.id, c.id, b.area_slug having count(*) >= $5
         order by ci.name, c.name, b.area_slug limit ${PER_PAGE} offset $4`,
        [site, q, like, offset, MIN_AREA_LISTINGS],
      )
    case 'cities':
      return adminSql<Row>(
        `select ci.name label, '' sub, '/' || ci.slug path, count(bs.business_id)::int n, (count(*) over ())::int total
         from cities ci left join businesses b on b.city_id = ci.id
           left join business_sites bs on bs.business_id = b.id and bs.site_id = $1
         where $2 = '' or ci.name ilike $3
         group by ci.id order by ci.name limit ${PER_PAGE} offset $4`,
        [site, q, like, offset],
      )
  }
}

export async function Websites({ site, type, q = '', page }: { site?: string; type?: string; q?: string; page?: string }) {
  const sites = await siteStats()
  const s = sites.find(x => String(x.id) === site)
  if (!s) return <Overview sites={sites} q={q} />
  return <SitePages s={s} type={TYPES.find(t => t.key === type)?.key ?? 'biz'} q={q} page={Math.max(1, Number(page) || 1)} />
}

async function Overview({ sites, q }: { sites: Site[]; q: string }) {
  const [codes, found] = await Promise.all([
    Promise.all(sites.map(s => siteStatus(s.domain))),
    q ? adminSql<{ title: string; city: string; slug: string; domain: string | null; site_id: number | null }>(
      `select b.title, ci.name city, b.slug, st.domain, st.id site_id
       from businesses b join cities ci on ci.id = b.city_id
         left join business_sites bs on bs.business_id = b.id left join sites st on st.id = bs.site_id
       where b.title ilike $1 order by b.review_count desc nulls last limit ${PER_PAGE}`,
      [`%${q.replace(/[\\%_]/g, '\\$&')}%`],
    ) : null,
  ])
  return (
    <>
      <p className="text-zinc-600">The websites sharing this database. Each shows only its own businesses, in its own design.</p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((s, i) => (
          <li key={s.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Website {s.id}</p>
                <a href={siteUrl(s.domain)} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold hover:text-brand-700 hover:underline">{s.domain}</a>
              </div>
              <StatusBadge code={codes[i]} />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums">{n(pageCount(s))} <span className="text-sm font-medium text-zinc-500">pages</span></p>
            <dl className="mt-3 flex-1 space-y-1.5 text-sm">
              {TYPES.map(t => (
                <div key={t.key} className="flex justify-between gap-3"><dt className="text-zinc-600">{t.label}</dt><dd className="font-medium tabular-nums">{n(t.count(s))}</dd></div>
              ))}
            </dl>
            <Link href={`/admin?tab=websites&site=${s.id}`} className="btn btn-outline mt-5 w-full">Browse pages</Link>
          </li>
        ))}
      </ul>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Find a business on any website</h2>
        <SearchBox hidden={{ tab: 'websites' }} q={q} placeholder="Business name" />
        {found && (found.length ? (
          <ul className="card mt-4 divide-y divide-zinc-100">
            {found.map(r => <PageRow key={r.slug} label={r.title} sub={`${r.city} · ${r.domain ? `Website ${r.site_id}: ${r.domain}` : 'no website'}`} href={pageHref(r.domain, `/biz/${r.slug}`)} />)}
          </ul>
        ) : <div className="mt-4"><Empty>No business called “{q}”.</Empty></div>)}
      </section>
    </>
  )
}

async function SitePages({ s, type, q, page }: { s: Site; type: PageType; q: string; page: number }) {
  const [code, rows] = await Promise.all([siteStatus(s.domain), sitePages(s.id, type, q, page)])
  const pages = Math.max(1, Math.ceil((rows[0]?.total ?? 0) / PER_PAGE))
  const href = (params: Record<string, string>) => `/admin?${new URLSearchParams({ tab: 'websites', site: String(s.id), type, ...(q ? { q } : {}), ...params })}`
  return (
    <>
      <Link href="/admin?tab=websites" className="text-sm font-medium text-brand-700 hover:underline">← All websites</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight">Website {s.id}: {s.domain}</h2>
        <StatusBadge code={code} />
      </div>
      <nav aria-label="Page types" className="mt-5 flex flex-wrap gap-x-6 border-b border-zinc-200">
        {TYPES.map(t => (
          <Link
            key={t.key} href={href({ type: t.key, page: '1' })} aria-current={t.key === type ? 'page' : undefined}
            className="-mb-px flex items-center gap-2 border-b-2 border-transparent py-2.5 text-sm font-semibold text-zinc-500 hover:text-zinc-900 aria-[current=page]:border-brand-600 aria-[current=page]:text-zinc-900"
          >
            {t.label}<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">{n(t.count(s))}</span>
          </Link>
        ))}
      </nav>
      <SearchBox hidden={{ tab: 'websites', site: String(s.id), type }} q={q} placeholder={type === 'biz' ? 'Business or city' : type === 'cities' ? 'City' : 'City, area or business type'} />
      {rows.length ? (
        <ul className="card mt-4 divide-y divide-zinc-100">
          {rows.map(r => <PageRow key={r.path} label={r.label} sub={[r.sub, r.path].filter(Boolean).join(' · ')} n={r.n} href={pageHref(s.domain, r.path)} />)}
        </ul>
      ) : <div className="mt-4"><Empty>No pages match.</Empty></div>}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
          {page > 1 ? <Link href={href({ page: String(page - 1) })} className="btn btn-outline px-3 py-1.5">← Previous</Link> : <span />}
          <span className="text-zinc-600">Page {n(page)} of {n(pages)}</span>
          {page < pages ? <Link href={href({ page: String(page + 1) })} className="btn btn-outline px-3 py-1.5">Next →</Link> : <span />}
        </nav>
      )}
    </>
  )
}

function SearchBox({ hidden, q, placeholder }: { hidden: Record<string, string>; q: string; placeholder: string }) {
  return (
    <form action="/admin" className="mt-4 flex gap-2">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input name="q" defaultValue={q} placeholder={placeholder} aria-label="Search" className="input" />
      <button type="submit" className="btn btn-primary">Search</button>
    </form>
  )
}

function PageRow({ label, sub, n: places, href }: { label: string; sub: string; n?: number | null; href: string }) {
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{label}</p>
        <p className="truncate text-sm text-zinc-500">{sub}</p>
      </div>
      {places != null && <span className="shrink-0 text-sm text-zinc-500 tabular-nums max-sm:hidden">{n(places)} places</span>}
      <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-outline shrink-0 px-3 py-1.5">Open</a>
    </li>
  )
}
